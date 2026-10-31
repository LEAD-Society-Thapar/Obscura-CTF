import { useAuth } from "../context/AuthContext.jsx";
import Button from "../components/ui/Button.jsx";
import PaperCard from "../components/ui/PaperCard.jsx";
import StampLabel from "../components/ui/StampLabel.jsx";

// Some gate hunts use a custom 404 page as the clue (e.g. CP17). Handle that here later.
export default function NotFound() {
  const { team } = useAuth();

  return (
    <section className="mx-auto max-w-lg px-4 py-12">
      <PaperCard innerClassName="relative px-6 py-10 text-center sm:px-10">
        <StampLabel animate className="absolute top-4 right-4 text-sm [--stamp-rotate:10deg]">
          Missing
        </StampLabel>
        <p className="font-display text-7xl text-blood sm:text-8xl">404</p>
        <h1 className="mt-2 font-heading text-2xl font-bold uppercase">This reel was cut</h1>
        <p className="mt-2 text-parchment-ink/85">
          Nothing in the archive at this address. Either it never existed, or Mogambo got here first.
        </p>
        <div className="mt-6">
          <Button to={team ? "/map" : "/"}>{team ? "Back to the map" : "Back home"}</Button>
        </div>
      </PaperCard>
    </section>
  );
}
