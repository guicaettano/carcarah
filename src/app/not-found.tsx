import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell not-found">
      <p className="section-kicker">Página não encontrada</p>
      <h1>Esta oportunidade não está disponível.</h1>
      <p>A busca pode ter sido removida ou não atender mais aos critérios atuais.</p>
      <Link className="investigate-button" href="/">
        Voltar ao painel
      </Link>
    </main>
  );
}
