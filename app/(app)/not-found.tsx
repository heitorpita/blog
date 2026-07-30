import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

// `notFound()` já era chamado em /subjects/[id] e /journal/[slug] sem nenhuma
// página correspondente. Aqui dentro do grupo (app) a tela sai com o shell em
// volta, então dá para navegar para outro lugar em vez de só ver um beco.
export default function AppNotFound() {
  return (
    <Card className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl text-foreground">Não encontrado</h1>
        <p className="mt-2 text-sm text-muted">
          Esta matéria ou post não existe mais — pode ter sido excluído, ou o endereço está
          errado.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard" className={buttonClasses("primary")}>
          Ir para o dashboard
        </Link>
        <Link href="/subjects" className={buttonClasses("secondary")}>
          Ver matérias
        </Link>
      </div>
    </Card>
  );
}
