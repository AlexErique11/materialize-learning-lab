import '../../styles/shortcuts.css';

const keyLabels: Record<string, string> = {
  ArrowLeft: '←', ArrowRight: '→', Control: 'Ctrl', Escape: 'Esc',
};

export function ShortcutKeys({ shortcuts }: { shortcuts: string }) {
  return <span className="shortcut-keys">{shortcuts.split(' ').map((shortcut, index) =>
    <span className="shortcut-chord" key={shortcut}>
      {index > 0 && <span className="shortcut-or">or</span>}
      {shortcut.split('+').map((key, part) => <span className="shortcut-key-part" key={key}>
        {part > 0 && <span aria-hidden="true">+</span>}<kbd>{keyLabels[key] ?? key}</kbd>
      </span>)}
    </span>)}
  </span>;
}
