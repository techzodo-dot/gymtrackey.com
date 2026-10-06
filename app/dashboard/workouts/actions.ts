"use server";
import { act, formObject, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { createDietPlan, createWorkoutPlan, readRows, toggleExercise } from "@/server/services/ops";

export async function toggleExerciseAction(fd: FormData) {
  const back = str(fd, "back") || "/dashboard/workouts";
  return act(back, async () => {
    const ctx = await actionAuth("workouts", "trainers");
    await toggleExercise(ctx.db, str(fd, "id"));
    return back;
  });
}

export async function createWorkoutAction(fd: FormData) {
  return act("/dashboard/workouts/new", async () => {
    const ctx = await actionAuth("workouts", "trainers");
    const rows = readRows(fd, "ex", ["day", "exercise", "sets", "reps", "weightKg", "restSec", "notes"]);
    const trainer = ctx.user.role === "TRAINER" ? await ctx.db.trainer.findFirst({ where: { userId: ctx.user.id } }) : null;
    const o = formObject(fd);
    const plan = await createWorkoutPlan(ctx.db, ctx.tenant.id, { ...o, trainerId: o.trainerId ?? trainer?.id }, rows);
    return `/dashboard/workouts?ok=${encodeURIComponent("Workout plan created.")}#${plan.id}`;
  });
}

export async function createDietAction(fd: FormData) {
  return act("/dashboard/diets/new", async () => {
    const ctx = await actionAuth("diets", "diet");
    const rows = readRows(fd, "meal", ["mealTime", "food", "quantity", "calories", "proteinG", "carbsG", "fatsG", "notes"]);
    await createDietPlan(ctx.db, ctx.tenant.id, formObject(fd), rows);
    return `/dashboard/diets?ok=${encodeURIComponent("Diet plan created.")}`;
  });
}
