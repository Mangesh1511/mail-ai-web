import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <main class="home-shell">
      <header class="home-topbar">
        <a class="brand" routerLink="/" aria-label="Mail AI home">
          <span class="brand-mark">m</span><span>mail<span class="brand-dot">.</span>ai</span>
        </a>
        <a class="button button-quiet" routerLink="/chat">Try now <span aria-hidden="true">→</span></a>
      </header>

      <section class="home-hero">
        <p class="eyebrow">EMAIL, ON YOUR SCHEDULE</p>
        <h1>Tell us what to<br><span>send and when.</span></h1>
        <p class="home-copy">Describe the email you want and when it should arrive. Mail.ai prepares a schedule for you to review before it is created.</p>
        <a class="button home-cta" routerLink="/chat">Try now <span aria-hidden="true">→</span></a>
        <p class="home-footnote">Connect Gmail to schedule. Messages are delivered through your Gmail account.</p>
      </section>

      <footer>Simple scheduling for the messages that matter.</footer>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;color:#20242d}.home-shell{max-width:1160px;min-height:100vh;margin:auto;padding:0 34px;display:flex;flex-direction:column}.home-topbar{height:78px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #20242d12}.brand{display:flex;align-items:center;gap:10px;color:#20242d;text-decoration:none;font:800 19px Manrope,sans-serif;letter-spacing:-.7px}.brand-mark{width:31px;height:31px;display:grid;place-items:center;border-radius:10px;background:#6659e8;color:white;font-size:21px}.brand-dot{color:#6659e8}.button{display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:10px;text-decoration:none;font:700 14px 'DM Sans',sans-serif;transition:.16s}.button-quiet{padding:11px 16px;border:1px solid #e1e3e9;background:#fff;color:#252a35}.button-quiet:hover{border-color:#bcb6f6;color:#574cdb}.home-hero{width:min(760px,100%);margin:auto;text-align:center;padding:90px 0}.eyebrow{margin:0 0 16px;color:#6659e8;font-size:11px;font-weight:800;letter-spacing:1.8px}.home-hero h1{margin:0;font:800 clamp(48px,8vw,88px)/.99 Manrope,sans-serif;letter-spacing:-5px}.home-hero h1 span{color:#6659e8}.home-copy{max-width:570px;margin:25px auto 0;color:#78808e;font:400 17px/1.65 'DM Sans',sans-serif}.home-cta{margin-top:32px;padding:15px 24px;background:#6659e8;color:#fff;box-shadow:0 8px 20px #6659e832}.home-cta:hover{background:#5146c9;transform:translateY(-1px)}.home-footnote{margin:13px 0 0;color:#979daa;font-size:12px}footer{padding:24px 0 29px;color:#a2a7b1;text-align:center;font-size:11px}@media(max-width:600px){.home-shell{padding:0 18px}.home-hero{padding:72px 0}.home-hero h1{letter-spacing:-3px}.home-copy{font-size:15px}}
  `],
})
export class HomePage {}
