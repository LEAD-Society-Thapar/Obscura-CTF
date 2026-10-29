// Temporary page body used by unbuilt pages. Delete once real pages exist.
export default function Placeholder({ title, children }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-neutral-400">{children || "Not built yet."}</p>
    </section>
  );
}
