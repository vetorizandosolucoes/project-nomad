export default function ServerError(props: { error: any }) {
  return (
    <>
      <div className="container">
        <div className="title">Erro do servidor</div>

        <span>{props.error.message}</span>
      </div>
    </>
  )
}