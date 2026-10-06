import { pageAuth } from "@/server/auth/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormGrid, Input, Select } from "@/components/ui/form";
import { RowsBuilder } from "@/components/ui/rows-builder";
import { Flash, PageHeader } from "@/components/ui/page";
import { fullName, isoDate } from "@/lib/format";
import { createWorkoutAction } from "../actions";

export const metadata = { title: "New workout plan" };
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => [d, d[0] + d.slice(1).toLowerCase()] as const);

export default async function NewWorkout({ searchParams }: { searchParams: Promise<{ member?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("workouts", "trainers");
  const [members, trainers] = await Promise.all([db.member.findMany({ where: { deletedAt: null }, orderBy: { firstName: "asc" }, take: 500 }), db.trainer.findMany({ where: { isActive: true } })]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="New workout plan" />
      <Flash error={sp.error} />
      <form action={createWorkoutAction} className="space-y-6">
        <Card><FormGrid>
          <Select label="Member *" name="memberId" required defaultValue={sp.member} options={members.map((m) => [m.id, `${fullName(m)} (${m.memberCode})`])} />
          <Select label="Trainer" name="trainerId" placeholder="—" options={trainers.map((t) => [t.id, t.name])} />
          <Input label="Plan name *" name="name" required placeholder="Push / Pull / Legs" /><span />
          <Input label="Start date *" name="startDate" type="date" required defaultValue={isoDate(new Date())} /><Input label="End date" name="endDate" type="date" />
        </FormGrid></Card>
        <Card><h2 className="mb-3 font-bold">Exercises</h2>
          <RowsBuilder prefix="ex" addLabel="Add exercise" initial={3} cols={[
            { key: "day", label: "Day", type: "select", options: DAYS }, { key: "exercise", label: "Exercise", placeholder: "Bench press" }, { key: "sets", label: "Sets", type: "number" }, { key: "reps", label: "Reps", type: "number" },
            { key: "weightKg", label: "Weight (kg)", type: "number" }, { key: "restSec", label: "Rest (sec)", type: "number" }, { key: "notes", label: "Instructions" }]} /></Card>
        <Button type="submit">Create plan</Button>
      </form>
    </div>
  );
}
