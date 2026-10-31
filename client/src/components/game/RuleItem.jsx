import Icon from "../ui/Icon.jsx";

// One numbered rule (design 8). Render inside an <ol>.
export default function RuleItem({ n, icon, title, body }) {
  return (
    <li className="flex gap-4 py-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-blood-bright/80 text-blood-bright">
        <Icon name={icon} className="size-5" />
      </span>
      <div>
        <h3 className="font-heading text-lg font-bold text-bone">
          {n}. {title}
        </h3>
        <p className="mt-0.5 text-muted">{body}</p>
      </div>
    </li>
  );
}
