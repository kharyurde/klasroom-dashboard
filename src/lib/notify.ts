import { supabase } from "./supabase";

export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  type?: string,
  link?: string
): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type: type ?? null,
    link: link ?? null,
  });
}

export async function notifyParent(
  parentId: string,
  title: string,
  message: string,
  type?: string,
  link?: string
): Promise<void> {
  await notifyUser(parentId, title, message, type, link);
}