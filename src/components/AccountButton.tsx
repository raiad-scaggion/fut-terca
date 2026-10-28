import { useState } from "react";
import { useAuth } from "../data/authContext";
import { checkWriteAccess } from "../data/writeCheck";

type WriteCheck = "idle" | "checking" | "ok" | "denied";

const WRITE_CHECK_TEXT: Record<WriteCheck, string> = {
  idle: "",
  checking: "Testando...",
  ok: "Gravação liberada.",
  denied: "Gravação negada pelo banco.",
};

export function AccountButton() {
  const { user, isAdmin, loading, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [writeCheck, setWriteCheck] = useState<WriteCheck>("idle");

  if (loading) {
    return null;
  }

  if (!user) {
    const handleSignIn = async () => {
      setError("");
      try {
        await signIn();
      } catch {
        setError("Não deu para entrar. Tente de novo.");
      }
    };
    return (
      <div className="account">
        <button type="button" className="button button--ghost" onClick={handleSignIn}>
          Entrar
        </button>
        {error && <p className="account__error">{error}</p>}
      </div>
    );
  }

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();

  const handleWriteCheck = async () => {
    setWriteCheck("checking");
    setWriteCheck((await checkWriteAccess(user.uid)) ? "ok" : "denied");
  };

  return (
    <div className="account">
      <button
        type="button"
        className={`account__avatar${isAdmin ? " is-admin" : ""}`}
        aria-expanded={open}
        aria-label="Minha conta"
        onClick={() => setOpen((value) => !value)}
      >
        {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : initial}
      </button>

      {open && (
        <div className="account__panel">
          <strong>{user.displayName}</strong>
          <span className="account__email">{user.email}</span>
          <span className={`account__role${isAdmin ? " is-admin" : ""}`}>
            {isAdmin ? "Admin" : "Só visualização. Peça para um admin liberar seu e-mail."}
          </span>
          <button type="button" className="button button--ghost" onClick={handleWriteCheck} disabled={writeCheck === "checking"}>
            Testar permissão de gravação
          </button>
          {writeCheck !== "idle" && <span className={`account__check account__check--${writeCheck}`}>{WRITE_CHECK_TEXT[writeCheck]}</span>}
          <button type="button" className="button button--ghost" onClick={() => signOut()}>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
