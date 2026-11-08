import Icon from "../ui/Icon.jsx";
import SafeMarkdown from "../ui/SafeMarkdown.jsx";

// One numbered rule (design 8). Render inside an <ol>.
export default function RuleItem({ n, icon, title, body }) {
  return (
    <li className="flex gap-4 py-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-blood-bright/80 text-blood-bright">
        <Icon name={icon} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="rulebook-serif text-lg font-bold text-bone">
          {n}. {title}
        </h3>
        <SafeMarkdown className="rulebook-prose mt-2">{body}</SafeMarkdown>
      </div>
    </li>
  );
}
