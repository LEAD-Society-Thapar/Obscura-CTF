import { useParams } from "react-router-dom";
import Placeholder from "../components/ui/Placeholder.jsx";
export default function Checkpoint() {
  const { slug } = useParams();
  return (
    <Placeholder title="Checkpoint">
      Scene, challenge, data pack, flag input, hints, attempt counter. Gate slug: {slug}
    </Placeholder>
  );
}
