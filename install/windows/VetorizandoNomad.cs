// Windows launcher: starts the system inside WSL, opens it in its own window and stays in the
// tray. Compiled by build.ps1 with the C# compiler that ships with Windows (C# 5 only).
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

static class Program
{
    public const string AppName = "Vetorizando NOMAD";
    public const string Url = "http://localhost:8080/";
    public const string Distro = "Ubuntu";
    public const string ComposeFile = "/opt/project-nomad/compose.yml";
    public const string KeepAliveTask = "NOMAD-WSL-KeepAlive";

    [DllImport("user32.dll")]
    static extern bool SetProcessDPIAware();

    [STAThread]
    static void Main(string[] args)
    {
        SetProcessDPIAware();
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        bool shutdownOnly = args.Length > 0 && args[0] == "--desligar";

        bool isFirst;
        using (var mutex = new Mutex(true, "VetorizandoNomadLauncher", out isFirst))
        using (var openRequest = new EventWaitHandle(false, EventResetMode.AutoReset, "VetorizandoNomadOpen"))
        {
            if (shutdownOnly)
            {
                Launcher.Shutdown();
                return;
            }
            if (!isFirst)
            {
                // Already in the tray: that copy opens the window.
                openRequest.Set();
                return;
            }
            Application.Run(new Launcher(openRequest));
        }
    }
}

/// <summary>Runs wsl.exe and friends with no console window.</summary>
static class Shell
{
    public static int Run(string file, string arguments, int timeoutMs)
    {
        using (var process = Process.Start(Hidden(file, arguments)))
        {
            if (process.WaitForExit(timeoutMs)) return process.ExitCode;
            try { process.Kill(); } catch (InvalidOperationException) { }
            return -1;
        }
    }

    public static int Wsl(string command, int timeoutMs)
    {
        return Run("wsl.exe", "-d " + Program.Distro + " -u root -- " + command, timeoutMs);
    }

    public static ProcessStartInfo Hidden(string file, string arguments)
    {
        var info = new ProcessStartInfo(file, arguments);
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        return info;
    }

    public static bool SystemAnswers()
    {
        try
        {
            var request = (HttpWebRequest)WebRequest.Create(Program.Url);
            request.Timeout = 3000;
            request.AllowAutoRedirect = false;
            request.Proxy = null;
            using (var response = (HttpWebResponse)request.GetResponse())
            {
                return (int)response.StatusCode < 500;
            }
        }
        catch (WebException)
        {
            return false;
        }
    }
}

class StartupFailed : Exception
{
    public StartupFailed(string message) : base(message) { }
}

class Launcher : ApplicationContext
{
    const int WslTimeoutMs = 120000;
    const int AnswerTimeoutMs = 240000;
    const int NudgeAfterMs = 60000;

    readonly NotifyIcon tray;
    readonly SplashForm splash;
    readonly EventWaitHandle openRequest;
    readonly object startLock = new object();
    Process keepAlive;
    bool busy;

    public Launcher(EventWaitHandle openRequest)
    {
        this.openRequest = openRequest;
        splash = new SplashForm();

        var menu = new ContextMenuStrip();
        menu.Items.Add("Abrir " + Program.AppName, null, delegate { StartAndOpen(); });
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Desligar o sistema (economiza bateria)", null, delegate { ConfirmShutdown(); });
        menu.Items.Add("Fechar este ícone (o sistema continua ligado)", null, delegate { Quit(); });

        tray = new NotifyIcon();
        tray.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        tray.Text = Program.AppName;
        tray.ContextMenuStrip = menu;
        tray.Visible = true;
        tray.DoubleClick += delegate { StartAndOpen(); };

        var listener = new Thread(ListenForOpenRequests);
        listener.IsBackground = true;
        listener.Start();

        StartAndOpen();
    }

    void ListenForOpenRequests()
    {
        while (true)
        {
            openRequest.WaitOne();
            splash.BeginInvoke((MethodInvoker)StartAndOpen);
        }
    }

    void StartAndOpen()
    {
        lock (startLock)
        {
            if (busy) return;
            busy = true;
        }
        // Touching Handle creates it on this thread, so the worker can always Invoke on the form.
        var unused = splash.Handle;
        var worker = new Thread(StartWorker);
        worker.IsBackground = true;
        worker.Start();
    }

    void StartWorker()
    {
        try
        {
            AllowAutomaticStart();
            if (!Shell.SystemAnswers())
            {
                Say("Ligando o Ubuntu...");
                StartSystem();
            }
            KeepWslRunning();
            OpenWindow();
            splash.BeginInvoke((MethodInvoker)splash.Hide);
        }
        catch (StartupFailed error)
        {
            splash.BeginInvoke((MethodInvoker)delegate
            {
                splash.Hide();
                var answer = MessageBox.Show(error.Message + "\n\nTentar de novo?", Program.AppName,
                    MessageBoxButtons.RetryCancel, MessageBoxIcon.Warning);
                if (answer == DialogResult.Retry) StartAndOpen();
            });
        }
        finally
        {
            lock (startLock) { busy = false; }
        }
    }

    void Say(string status)
    {
        splash.BeginInvoke((MethodInvoker)delegate
        {
            splash.SetStatus(status);
            if (!splash.Visible) splash.Show();
        });
    }

    void StartSystem()
    {
        int found = Shell.Wsl("test -f " + Program.ComposeFile, WslTimeoutMs);
        if (found == -1)
            throw new StartupFailed("O Ubuntu não respondeu. Feche programas para liberar memória; se continuar, reinicie o computador.");
        if (found != 0)
            throw new StartupFailed("O sistema não está instalado neste computador (Ubuntu no WSL com " + Program.ComposeFile + ").");

        Say("Ligando os serviços...");
        Shell.Wsl("systemctl start docker", WslTimeoutMs);

        Say("Aguardando o sistema responder...");
        var clock = Stopwatch.StartNew();
        bool nudged = false;
        while (clock.ElapsedMilliseconds < AnswerTimeoutMs)
        {
            if (Shell.SystemAnswers()) return;
            // Only the core: `compose up` would also start what the current mode keeps off.
            if (!nudged && clock.ElapsedMilliseconds > NudgeAfterMs)
            {
                nudged = true;
                Shell.Wsl("docker start nomad_mysql nomad_redis nomad_admin", WslTimeoutMs);
            }
            Thread.Sleep(2000);
        }
        throw new StartupFailed("Os serviços ligaram, mas o sistema não respondeu em " + (AnswerTimeoutMs / 60000) + " minutos.");
    }

    // A previous "Desligar" turned the automatic start off, and opening the app turns it back on.
    static void AllowAutomaticStart()
    {
        Shell.Run("schtasks.exe", "/Change /TN " + Program.KeepAliveTask + " /ENABLE", 15000);
    }

    // WSL powers off when nothing is using it, so one idle process stays attached while we run.
    void KeepWslRunning()
    {
        if (keepAlive != null && !keepAlive.HasExited) return;
        keepAlive = Process.Start(Shell.Hidden("wsl.exe", "-d " + Program.Distro + " -u root -- sleep infinity"));
    }

    void StopKeepAlive()
    {
        if (keepAlive == null) return;
        try { if (!keepAlive.HasExited) keepAlive.Kill(); } catch (InvalidOperationException) { }
        keepAlive = null;
    }

    static void OpenWindow()
    {
        string programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string edge = Path.Combine(programFilesX86, @"Microsoft\Edge\Application\msedge.exe");
        if (File.Exists(edge))
        {
            Process.Start(edge, "--app=" + Program.Url);
            return;
        }
        Process.Start(new ProcessStartInfo(Program.Url) { UseShellExecute = true });
    }

    void ConfirmShutdown()
    {
        var answer = MessageBox.Show(
            "Desligar o sistema e o Ubuntu?\n\nA IA e os aplicativos param de funcionar, e o sistema só volta quando você abrir este programa de novo.",
            Program.AppName, MessageBoxButtons.OKCancel, MessageBoxIcon.Question);
        if (answer != DialogResult.OK) return;

        tray.Text = "Desligando...";
        StopKeepAlive();
        var worker = new Thread(delegate()
        {
            Shutdown();
            splash.BeginInvoke((MethodInvoker)Quit);
        });
        worker.IsBackground = true;
        var unused = splash.Handle;
        worker.Start();
    }

    /// <summary>
    /// Stopping the Docker daemon (not the containers) shuts the databases down cleanly and keeps
    /// each container's state, so everything that was on comes back on the next start.
    /// </summary>
    public static void Shutdown()
    {
        Shell.Run("schtasks.exe", "/Change /TN " + Program.KeepAliveTask + " /DISABLE", 15000);
        Shell.Run("schtasks.exe", "/End /TN " + Program.KeepAliveTask, 15000);
        Shell.Wsl("systemctl stop docker.socket docker", WslTimeoutMs);
        Shell.Run("wsl.exe", "--terminate " + Program.Distro, 60000);
    }

    void Quit()
    {
        StopKeepAlive();
        tray.Visible = false;
        tray.Dispose();
        ExitThread();
    }
}

class SplashForm : Form
{
    readonly Label status;

    public SplashForm()
    {
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(420, 210);
        BackColor = ColorTranslator.FromHtml("#0a2a4a");
        ShowInTaskbar = true;
        Text = Program.AppName;
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);

        var title = new Label();
        title.Text = Program.AppName;
        title.ForeColor = Color.White;
        title.Font = new Font("Segoe UI Semibold", 18F);
        title.TextAlign = ContentAlignment.MiddleCenter;
        title.SetBounds(0, 50, 420, 44);

        status = new Label();
        status.ForeColor = ColorTranslator.FromHtml("#bfdcf5");
        status.Font = new Font("Segoe UI", 10F);
        status.TextAlign = ContentAlignment.MiddleCenter;
        status.SetBounds(0, 100, 420, 28);

        var bar = new ProgressBar();
        bar.Style = ProgressBarStyle.Marquee;
        bar.MarqueeAnimationSpeed = 30;
        bar.SetBounds(60, 146, 300, 6);

        Controls.Add(title);
        Controls.Add(status);
        Controls.Add(bar);
    }

    public void SetStatus(string text)
    {
        status.Text = text;
    }
}
