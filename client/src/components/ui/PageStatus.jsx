import Spinner from "./Spinner.jsx";

// Loading / error placeholder for page bodies.
export default function PageStatus({ loading, error, label = "Loading" }) {
  if (loading) {
    return (
      <p role="status" className="flex items-center gap-3 py-16 font-type text-muted">
        <Spinner />
        {label}...
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="py-16 text-blood-bright">
        {error.message || "Something went wrong."}
      </p>
    );
  }
  return null;
}
