import { pageAuth } from "@/server/auth/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { RowsBuilder } from "@/components/ui/rows-builder";
import { Flash, PageHeader } from "@/components/ui/page";
import { fullName } from "@/lib/format";
import { createDietAction } from "../../workouts/actions";

export const metadata = { title: "New diet plan" };
const MEALS = [["BREAKFAST", "Breakfast"], ["MID_MORNING", "Mid-morning"], ["LUNCH", "Lunch"], ["EVENING", "Evening"], ["DINNER", "Dinner"], ["BEFORE_BED", "Before bed"]] as const;

export default async function NewDiet({ searchParams }: { searchParams: Promise<{ member?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("diets", "diet");
  const [members, trainers] = await Promise.all([db.member.findMany({ where: { deletedAt: null }, orderBy: { firstName: "asc" }, take: 500 }), db.trainer.findMany({ where: { isActive: true } })]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="New diet plan" /><Flash error={sp.error} />
      <form action={createDietAction} className="space-y-6">
        <Card><FormGrid>
          <Select label="Member *" name="memberId" required defaultValue={sp.member} options={members.map((m) => [m.id, `${fullName(m)} (${m.memberCode})`])} />
          <Select label="Trainer" name="trainerId" placeholder="—" options={trainers.map((t) => [t.id, t.name])} />
          <Input label="Plan name *" name="name" required placeholder="High-protein plan" wrap="sm:col-span-2" /></FormGrid><div className="mt-4"><Textarea label="Notes" name="notes" /></div></Card>
        <Card><h2 className="mb-3 font-bold">Meals</h2>
          <RowsBuilder prefix="meal" addLabel="Add meal" initial={3} cols={[
            { key: "mealTime", label: "Meal", type: "select", options: MEALS }, { key: "food", label: "Food" }, { key: "quantity", label: "Quantity" }, { key: "calories", label: "Calories", type: "number" },
            { key: "proteinG", label: "Protein (g)", type: "number" }, { key: "carbsG", label: "Carbs (g)", type: "number" }, { key: "fatsG", label: "Fats (g)", type: "number" }, { key: "notes", label: "Notes" }]} /></Card>
        <Button type="submit">Create plan</Button>
      </form>
    </div>
  );
}
