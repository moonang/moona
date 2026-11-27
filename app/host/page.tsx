import Soon from "@/components/Soon";
export const metadata = { title: "Hosting" };
export default function Host() {
  return <Soon title={<>Your <em>guest lists</em></>}>The host dashboard (approvals, door check-in, bring list, certificates) arrives in the next build session. Sign-in is ready at <a href="/login">/login</a>.</Soon>;
}
