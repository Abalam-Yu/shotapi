export function CodeSample({ code, label }: { code: string; label?: string }) {
  return (
    <figure className="code">
      {label ? <figcaption>{label}</figcaption> : null}
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
