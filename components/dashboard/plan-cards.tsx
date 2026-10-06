import { Card } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import { toggleExerciseAction } from "@/app/dashboard/workouts/actions";

type Plan = { id: string; name: string; startDate: Date; endDate: Date | null; trainer: { name: string } | null; exercises: { id: string; day: string; exercise: string; sets: number | null; reps: number | null; weightKg: unknown; completed: boolean }[] };
export function WorkoutCard({ plan, back, readOnly }: { plan: Plan; back: string; readOnly?: boolean }) {
  const days = [...new Set(plan.exercises.map((e) => e.day))];
  const done = plan.exercises.filter((e) => e.completed).length;
  return (
    <Card id={plan.id}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-bold">{plan.name}</h3><p className="text-xs text-muted">{fmtDate(plan.startDate)} → {fmtDate(plan.endDate)} · {plan.trainer?.name ?? "No trainer"}</p></div>
        <span className="text-sm font-semibold text-brand">{plan.exercises.length ? Math.round((done / plan.exercises.length) * 100) : 0}% complete</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {days.map((d) => (
          <div key={d} className="rounded-xl bg-surface2 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{d}</p>
            <ul className="space-y-1.5 text-sm">
              {plan.exercises.filter((e) => e.day === d).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  {readOnly ? <span className="flex items-center gap-2"><span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs ${e.completed ? "gt-gradient-bg border-transparent" : "border-line"}`}>{e.completed ? "✓" : ""}</span><span className={e.completed ? "text-muted line-through" : ""}>{e.exercise}</span></span> :
                  <form action={toggleExerciseAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={e.id} /><input type="hidden" name="back" value={back} />
                    <button aria-label={`Mark ${e.exercise} ${e.completed ? "incomplete" : "complete"}`} className={`h-5 w-5 shrink-0 rounded border ${e.completed ? "gt-gradient-bg border-transparent" : "border-line"}`}>{e.completed ? "✓" : ""}</button>
                    <span className={e.completed ? "text-muted line-through" : ""}>{e.exercise}</span>
                  </form>}
                  <span className="text-xs text-muted">{e.sets ?? "–"}×{e.reps ?? "–"}{e.weightKg ? ` · ${String(e.weightKg)}kg` : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

type Diet = { id: string; name: string; notes: string | null; meals: { id: string; mealTime: string; food: string; quantity: string | null; calories: number | null; proteinG: unknown; carbsG: unknown; fatsG: unknown }[] };
export function DietCard({ plan }: { plan: Diet }) {
  const kcal = plan.meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const order = ["BREAKFAST", "MID_MORNING", "LUNCH", "EVENING", "DINNER", "BEFORE_BED"];
  return (
    <Card>
      <div className="mb-3 flex justify-between"><div><h3 className="font-bold">{plan.name}</h3>{plan.notes && <p className="text-xs text-muted">{plan.notes}</p>}</div><span className="text-sm font-semibold text-brand">{kcal} kcal/day</span></div>
      <ul className="divide-y divide-line text-sm">
        {[...plan.meals].sort((a, b) => order.indexOf(a.mealTime) - order.indexOf(b.mealTime)).map((m) => (
          <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b>{m.mealTime.replace("_", " ")}</b> · {m.food}{m.quantity ? ` (${m.quantity})` : ""}</span>
            <span className="text-xs text-muted">{m.calories ?? "–"} kcal · P {String(m.proteinG ?? "–")} C {String(m.carbsG ?? "–")} F {String(m.fatsG ?? "–")}</span></li>))}
      </ul>
    </Card>
  );
}
