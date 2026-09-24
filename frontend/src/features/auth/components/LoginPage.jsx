import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../lib/api";
import { getDefaultPathForRole, storeAuthSession } from "../../../lib/auth";

const roleLabels = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  accountant: "Accountant",
  pharmacist: "Pharmacist",
  lab_tech: "Lab Technician",
  patient: "Patient",
};

export function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewRole, setPreviewRole] = useState("");

  const roleText = useMemo(() => {
    if (!previewRole) {
      return "Role will be detected after login";
    }
    return `Role access: ${roleLabels[previewRole] || previewRole}`;
  }, [previewRole]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: identifier,
          identifier,
          password,
        }),
      });

      storeAuthSession({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        user: response.data.user,
      });

      const nextRole = response.data.user?.role || "";
      setPreviewRole(nextRole);
      navigate(getDefaultPathForRole(nextRole), { replace: true });
    } catch (err) {
      setPreviewRole("");
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_bottom,#88dbe8_0%,#58a8b6_38%,#2f7a84_72%,#1e5a63_100%)] px-4 py-10">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,35,40,0.2),transparent_18%)]" />
      <div className="absolute -top-24 left-[-8%] h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-[-6rem] right-[-4%] h-80 w-80 rounded-full bg-[#9de6ef]/25 blur-3xl" />

      <div className="relative w-full max-w-[420px] border border-white/35 bg-white/22 px-8 py-10 text-white shadow-[0_30px_70px_rgba(10,44,51,0.32)] backdrop-blur-md max-sm:px-5">
        <div className="mx-auto mb-8 w-fit text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/12 text-lg font-semibold tracking-[0.2em]">
            HR
          </div>
          <h1 className="text-[22px] font-bold tracking-wide">HOSPITAL RESOLVE</h1>
          <p className="mt-2 text-[12px] uppercase tracking-[0.22em] text-white/72">{roleText}</p>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-white">USER NAME</span>
            <input
              className="h-11 w-full rounded-[10px] border border-white/50 bg-white px-4 text-[15px] text-[#204953] outline-none transition focus:border-[#104d57] focus:ring-3 focus:ring-[#0d515c]/20"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Username or email"
              type="text"
              value={identifier}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-white">PASSWORD</span>
            <input
              className="h-11 w-full rounded-[10px] border border-white/50 bg-white px-4 text-[15px] text-[#204953] outline-none transition focus:border-[#104d57] focus:ring-3 focus:ring-[#0d515c]/20"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              value={password}
            />
          </label>

          {error ? <div className="rounded-[10px] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#b3261e]">{error}</div> : null}

          <button
            className="h-11 w-full rounded-[10px] bg-[#145b64] text-[16px] font-semibold text-white shadow-[0_14px_32px_rgba(8,49,56,0.3)] transition hover:bg-[#0f4f57] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-10 text-center text-[13px] text-white/88">Developed by DESHID BD</div>
      </div>
    </section>
  );
}
