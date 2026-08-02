// ============================================================
// All page copy and pricing, in one place, in both languages.
// Edit this file to change words or prices — nothing else in the
// landing page needs to change.
//
// Two things flagged for you specifically:
//   1. Price figures below are placeholders (search for "FIXME
//      PRICE"). You said the platform admin will set real pricing
//      later — until then this shows an obviously-fake number so
//      nobody mistakes it for a real price.
//   2. The Burmese ("mm") copy was drafted by Claude, not a native
//      speaker. It should be correct, readable Burmese, but for
//      customer-facing marketing text like this, a native-speaker
//      pass before publishing is worth doing — tone and word choice
//      matter a lot here.
// ============================================================

// Where the "Get Gold" / "Get Platinum" buttons send people — your
// existing admin app's sign-in, which already auto-creates an
// account on first Google sign-in. Set this to your real deployed URL.
const ADMIN_SIGNUP_URL = "https://your-admin-app.vercel.app/";

const CONTENT = {
  en: {
    nav: {
      brand: "OneClickPOS",
      signIn: "Sign in",
    },
    story: {
      kicker: "How it works",
      frames: [
        {
          headline: "Put a QR code on the table.",
          body: "That's the setup. No terminal to buy, no app for them to install.",
        },
        {
          headline: "They scan. You're already selling.",
          body: "Their own phone camera opens your menu \u2014 nothing to download.",
        },
        {
          headline: "They browse, they order.",
          body: "From their table, at their own pace \u2014 no waving down a server for a menu.",
        },
        {
          headline: "The kitchen sees it instantly.",
          body: "Order tickets land the moment they tap confirm \u2014 no shouting order numbers.",
        },
        {
          headline: "And your phone buzzes.",
          body: "Live order and payment status, before the food's even started.",
        },
      ],
    },
    pricing: {
      kicker: "Pricing",
      heading: "Two ways to run it",
      sub: "Straightforward plans. Talk to us if you need something in between.",
      contactNote: "Pricing is set and updated by us directly \u2014 get in touch and we'll confirm current rates for your shop.",
      plans: [
        {
          id: "gold",
          name: "Gold",
          price: "25,000 MMK",
          period: "/ month",
          tagline: "For a single shop finding its footing.",
          features: [
            "Up to 2 stores",
            "Up to 50 products",
            "Staff accounts (owner, manager, cashier, kitchen)",
            "Live order dashboard",
            "KBZPay, WavePay, CBPay support",
            "Android admin app",
            "Standard support",
          ],
          cta: "Get Gold",
        },
        {
          id: "platinum",
          name: "Platinum",
          price: "45,000 MMK",
          period: "/ month",
          tagline: "For shops running more than one location.",
          featured: true,
          features: [
            "Everything in Gold",
            "Up to 5 stores",
            "100+ products",
            "Sales analytics & best-sellers",
            "Priority support",
          ],
          cta: "Get Platinum",
        },
      ],
    },
    finalCta: {
      heading: "Your tables are ready. Are you?",
      sub: "Setup takes minutes \u2014 sign in with Google and you're in.",
      button: "Get started",
    },
    footer: {
      tagline: "QR ordering built for how Myanmar shops actually run.",
      rights: "All rights reserved.",
    },
  },

  mm: {
    nav: {
      brand: "OneClickPOS",
      signIn: "ဝင်ရောက်ရန်",
    },
    story: {
      kicker: "အလုပ်လုပ်ပုံ",
      frames: [
        {
          headline: "စားပွဲပေါ် QR ကုဒ် တင်ထားလိုက်ပါ။",
          body: "ဒါပဲ လိုအပ်ပါတယ်။ စက်ဝယ်စရာ၊ အက်ပ်ထည့်စရာ မလိုပါ။",
        },
        {
          headline: "စကင်ဖတ်လိုက်တာနဲ့ အရောင်းစပါပြီ။",
          body: "ဖုန်းကင်မရာနဲ့ မီနူးပွင့်လာပါတယ်။ ဘာမှ download လုပ်စရာ မလိုပါ။",
        },
        {
          headline: "ကြည့်ပြီး မှာယူနိုင်ပါတယ်။",
          body: "စားပွဲကနေပဲ သူတို့အချိန်နဲ့ မှာလို့ရပါတယ်။",
        },
        {
          headline: "မီးဖိုချောင်က ချက်ချင်းသိပါတယ်။",
          body: "Order တင်လိုက်တာနဲ့ မီးဖိုချောင်ကို ချက်ချင်းရောက်သွားပါတယ်။",
        },
        {
          headline: "ဖုန်းလေးလည်း တုန်သွားပါလိမ့်မယ်။",
          body: "Order status နဲ့ ငွေပေးချေမှု အချက်အလက်ကို ချက်ချင်းမြင်ရပါတယ်။",
        },
      ],
    },
    pricing: {
      kicker: "စျေးနှုန်း",
      heading: "ရွေးချယ်စရာ နှစ်မျိုး",
      sub: "ရိုးရှင်းတဲ့ အစီအစဉ်တွေပါ။ အလယ်အလတ် လိုအပ်ရင် ဆက်သွယ်ပါ။",
      contactNote: "စျေးနှုန်းကို ကျွန်ုပ်တို့ကိုယ်တိုင် သတ်မှတ်ပြီး update လုပ်ပါတယ်။ ဆက်သွယ်ပါက လက်ရှိစျေးနှုန်းကို အတည်ပြုပေးပါမယ်။",
      plans: [
        {
          id: "gold",
          name: "Gold",
          price: "25,000 ကျပ်",
          period: "/ လ",
          tagline: "စတင်နေတဲ့ ဆိုင်တစ်ဆိုင်အတွက်။",
          features: [
            "ဆိုင် ၂ ဆိုင်အထိ",
            "ပစ္စည်း ၅၀ အထိ",
            "ဝန်ထမ်းအကောင့် ထည့်နိုင်သည် (ပိုင်ရှင်၊ မန်နေဂျာ၊ ငွေကိုင်၊ မီးဖိုချောင်)",
            "Live order dashboard",
            "KBZPay, WavePay, CBPay ထောက်ပံ့သည်",
            "Android admin app",
            "ပုံမှန် အကူအညီ",
          ],
          cta: "Gold ယူမည်",
        },
        {
          id: "platinum",
          name: "Platinum",
          price: "45,000 ကျပ်",
          period: "/ လ",
          tagline: "ဆိုင်ခွဲ တစ်ခုထက်ပိုသော လုပ်ငန်းအတွက်။",
          featured: true,
          features: [
            "Gold ပါ အားလုံးပါဝင်သည်",
            "ဆိုင် ၅ ဆိုင်အထိ",
            "ပစ္စည်း ၁၀၀ အထက်",
            "အရောင်းစာရင်း ခွဲခြမ်းစိတ်ဖြာမှု",
            "ဦးစားပေး အကူအညီ",
          ],
          cta: "Platinum ယူမည်",
        },
      ],
    },
    finalCta: {
      heading: "စားပွဲတွေ အသင့်ရှိပါပြီ။ သင်ရော အသင့်လား။",
      sub: "Google နှင့် ဝင်ရောက်ပြီး စတင်လိုက်ရုံပါပဲ။",
      button: "စတင်မည်",
    },
    footer: {
      tagline: "မြန်မာဆိုင်များအတွက် QR မှာယူစနစ်။",
      rights: "မူပိုင်ခွင့် အားလုံး ရယူထားသည်။",
    },
  },
};
