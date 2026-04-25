import { redirect } from "next/navigation";

/** Entry URL for external coach portal — real UI lives under `/external-coach/requests`. */
export default function ExternalCoachIndexPage() {
  redirect("/external-coach/requests");
}
