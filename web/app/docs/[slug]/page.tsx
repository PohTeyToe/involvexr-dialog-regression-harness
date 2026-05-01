import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOCS } from "@/lib/docs";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) return notFound();

  const docList = Object.entries(DOCS);

  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 grid gap-8 lg:grid-cols-[220px_1fr]">
      {/* Sidebar */}
      <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
          Docs
        </div>
        <ul className="space-y-0.5">
          {docList.map(([s, d]) => (
            <li key={s}>
              <Link
                href={`/docs/${s}`}
                className={
                  "block rounded-md px-3 py-1.5 text-sm transition-colors " +
                  (s === slug
                    ? "bg-[var(--accent)] text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]")
                }
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      {/* Content */}
      <Card>
        <CardContent className="p-8 lg:p-10">
          <Badge variant="outline" className="font-mono text-[10px] mb-3">
            docs / {slug}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">{doc.title}</h1>
          {doc.subtitle && (
            <p className="text-sm text-[var(--muted-foreground)] mb-6">{doc.subtitle}</p>
          )}
          <article className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.body}</ReactMarkdown>
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
