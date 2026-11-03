/** Explains a feature whose eMachine save API isn't wired up yet. */
export function NotConnected({ what, children }) {
  return (
    <div className="not-connected" role="note">
      <strong>{what} isn’t connected to eMachine yet.</strong>
      <p>{children}</p>
    </div>
  );
}
