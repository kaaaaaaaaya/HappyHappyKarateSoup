import { Link, useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const handleGuestPlay = () => {
    // ゲスト時は前のログイン情報をクリア
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    sessionStorage.removeItem('connectedRoomId');
    navigate('/connect');
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#1b1614] text-white">
      <img
        src="/images/overall.png"
        alt="Background"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-black/25" />

      <header className="absolute left-3 top-3 z-20 flex items-center gap-3 sm:left-6 sm:top-5">
        <img
          src="/images/title_arm.png"
          alt="Game icon"
          className="h-10 w-10 rounded-md bg-black/35 p-1 shadow-lg sm:h-12 sm:w-12"
        />
        <span
          className="font-[var(--f-pixel)] text-[10px] uppercase tracking-wide text-[#f8f1de] drop-shadow sm:text-xs"
          style={{ textShadow: '2px 2px 0 #1f0e0a' }}
        >
          Happy Happy Karate Soup
        </span>
      </header>

      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-6 sm:top-5">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center border-2 border-[#2f1a13] bg-[#8bcfca] font-[var(--f-pixel)] text-[10px] text-[#24120e] shadow-[0_4px_0_#2f1a13] sm:h-10 sm:w-10"
          aria-label="Help"
        >
          ?
        </button>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center border-2 border-[#2f1a13] bg-[#f0df95] font-[var(--f-pixel)] text-[10px] text-[#24120e] shadow-[0_4px_0_#2f1a13] sm:h-10 sm:w-10"
          aria-label="Profile"
        >
          ◎
        </button>
      </div>

      <section className="relative z-10 flex h-full flex-col items-center justify-center px-4 pb-14 pt-20 sm:pb-20 sm:pt-24">
        <img
          src="/images/Title.png"
          alt="Happy Happy Karate Soup"
          className="w-full max-w-[540px] object-contain drop-shadow-[0_8px_0_rgba(28,14,10,0.7)] animate-bounce"
        />

        <div className="mt-8 flex w-full max-w-[460px] flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
          <button
            onClick={handleGuestPlay}
            className="w-full border-2 border-[#2f1a13] bg-[#c36453] px-8 py-3 font-[var(--f-pixel)] text-base uppercase tracking-wide text-[#fff6e7] shadow-[0_6px_0_#2f1a13] transition hover:-translate-y-0.5 hover:bg-[#d47462] hover:shadow-[0_7px_0_#2f1a13] active:translate-y-1 active:shadow-[0_3px_0_#2f1a13] sm:w-[200px]"
          >
            ▷ Start
          </button>

          <Link
            to="/login"
            className="w-full border-2 border-[#2f1a13] bg-[#f8efe2] px-8 py-3 font-[var(--f-pixel)] text-base uppercase tracking-wide text-[#2f1a13] shadow-[0_6px_0_#2f1a13] transition hover:-translate-y-0.5 hover:bg-[#fff8ef] hover:shadow-[0_7px_0_#2f1a13] active:translate-y-1 active:shadow-[0_3px_0_#2f1a13] sm:w-[200px]"
          >
            ⚙ Login
          </Link>
        </div>
      </section>
    </main>
  );
}
