import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { newQuestion } from "@/lib/grownup";
import { answerGrownup } from "./actions";

export const dynamic = "force-dynamic";

// The grown-up check. Not read aloud, on purpose.
export default async function GrownupGate({ searchParams }: { searchParams: Promise<{ next?: string; wrong?: string }> }) {
  const { next = "/plans", wrong } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const q = newQuestion();

  return (
    <section className="panel gate">
      <h1>
        <span aria-hidden>🔑</span> Grown-ups only
      </h1>
      <p className="hint">This part is for parents. Please answer to continue.</p>
      {wrong && <p className="error">That&apos;s not quite right. Here&apos;s a new one.</p>}
      <form action={answerGrownup} className="gate-form">
        <input type="hidden" name="token" value={q.token} />
        <input type="hidden" name="next" value={next} />
        <label className="gate-q" htmlFor="answer">
          What is {q.a} × {q.b}?
        </label>
        <input
          id="answer"
          name="answer"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          required
          autoFocus
          aria-label="Answer"
        />
        <button className="big-btn small" type="submit">Continue</button>
      </form>
    </section>
  );
}
