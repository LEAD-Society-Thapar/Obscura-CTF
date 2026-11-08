import { Link, useParams } from "react-router-dom";
import { useReel } from "../hooks/useGameData.js";
import { isFinalCp } from "../lib/format.js";
import ReelCardBody from "../components/game/ReelCardBody.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";

// Design 5 as a standalone page (/reel/2.2), so the card can be revisited and styled without solving.
export default function ReelCard() {
  const { cpId } = useParams();
  const { loading, error, reel, next } = useReel(cpId);

  if (loading || error) {
    return (
      <div>
        <PageStatus loading={loading} error={error} label="Threading the reel" />
        {error && (
          <Link to="/challenges" className="text-gold hover:underline">
            Back to Challenges
          </Link>
        )}
      </div>
    );
  }

  const action = next
    ? { to: `/gate/${next.slug}`, label: isFinalCp(next) ? "Face Mogambo" : "Go to next checkpoint" }
    : isFinalCp(reel)
      ? { to: "/challenges", label: "Back to your dossier" }
      : { to: `/challenges/act/${reel.act}`, label: `Back to Act ${reel.act}` };

  return (
    <div className="mx-auto max-w-2xl py-4">
      <ReelCardBody reel={reel} action={action} headingAs="h1" />
    </div>
  );
}
