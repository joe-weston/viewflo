import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const evidence = "tmp/ui-verification/admin-billing-magic-link";
test.beforeAll(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  // Isolated component renders, never an application route or authentication bypass.
  fs.writeFileSync(
    "tmp/render-billing-fixtures.jsx",
    `
      import React from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import fs from "node:fs";
      import { BillingOverview } from "../src/components/BillingOverview";
      import { BillingLoading } from "../src/components/BillingLoading";
      import { unavailableBilling } from "../lib/billing-data";
      globalThis.React = React;
      const links={billing:"/admin/billing",terms:"/admin/agreements/terms",privacy:"/admin/agreements/privacy"};
      const base={...unavailableBilling(),available:true,status:"active",amount:16900,nextBillingAt:1790812800,canManage:true};
      const invoices=["paid","open","void"].map((status,i)=>({id:"in_fixture"+i,number:"VF-100"+i,created:1788220800-i*2678400,total:16900,paid:status==="paid"?16900:0,currency:"usd",status,paidAt:status==="paid"?1788220800:null,dueAt:status==="open"?1790812800:null,url:"https://invoice.stripe.com/i/fixture",pdf:null}));
      const css=fs.readFileSync("app/globals.css","utf8").replace(/@tailwind[^;]*;/g,"");
      for(const [state,snapshot] of [["history",{...base,invoices,nextCursor:"in_fixture2"}],["empty",base],["unavailable",unavailableBilling()],["loading",unavailableBilling()]]){
        const html=renderToStaticMarkup(<div className="portal-shell admin-shell"><p role="note">Design fixture · synthetic data · no authentication or provider evidence</p><header className="portal-header"><a href="/">Pasadena Shades &amp; Shutters</a><button className="secondary">Sign out</button></header><p className="eyebrow">PRIVATE BUSINESS WORKSPACE</p><h1>Pasadena Shades &amp; Shutters</h1><nav className="portal-nav admin-tabs" aria-label="Workspace"><a href="/admin">Overview</a><a href="/admin/billing" aria-current="page">Billing</a><a href="/">Website</a></nav>{state === "loading" ? <BillingLoading/> : <BillingOverview snapshot={snapshot} links={links} termsStatus="Accepted · test-v1" privacyStatus="Review required" actions={<button disabled={!snapshot.canManage}>Manage payment method</button>}/>}<footer className="admin-footer">Your business workspace · Powered by Viewflo</footer></div>);
        fs.writeFileSync("${evidence}/fixture-"+state+".html",'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Billing design fixture</title><style>*{box-sizing:border-box}body{margin:0}button,input{font:inherit}.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}'+css+'</style></head><body>'+html+'</body></html>');
      }
    `,
  );
  execFileSync(process.execPath, [
    "--import",
    "tsx",
    "tmp/render-billing-fixtures.jsx",
  ]);
});

test("billing component design states with synthetic invoice data", async ({
  page,
}, info) => {
  for (const state of ["history", "empty", "unavailable", "loading"]) {
    await page.goto("/auth?tenant=pasadena-shades-and-shutters");
    const fontContext = await page.evaluate(() => ({
      classes: document.documentElement.className,
      bodyClasses: document.body.className,
      styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((link) => link.outerHTML)
        .join(""),
    }));
    const fixture = fs
      .readFileSync(path.resolve(`${evidence}/fixture-${state}.html`), "utf8")
      .replace(
        '<html lang="en">',
        `<html lang="en" class="${fontContext.classes}">`,
      )
      .replace("<body>", `<body class="${fontContext.bodyClasses}">`)
      .replace("</head>", fontContext.styles + "</head>");
    await page.setContent(fixture);
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "Billing", exact: true }),
    ).toBeVisible();
    if (state !== "loading")
      await expect(
        page.getByRole("link", { name: "Terms & Conditions" }),
      ).toBeVisible();
    if (state !== "loading")
      await expect(
        page.getByRole("link", { name: "Privacy Policy", exact: true }),
      ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (state === "history") {
      await expect(
        page.getByText("Awaiting payment", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Older invoices →" }),
      ).toHaveAttribute("href", "/admin/billing?after=in_fixture2");
    }
    if (state === "unavailable")
      await expect(
        page.getByRole("button", { name: "Manage payment method" }),
      ).toBeDisabled();
    await page.screenshot({
      path: `${evidence}/${info.project.name}-billing-${state}-fixture.png`,
      fullPage: true,
    });
  }
});
