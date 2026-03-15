import { useState, useEffect, useRef, useCallback } from "react";
import ALL_QUESTIONS from './data/questions';
import FrenchPractice from './FrenchPractice';

const STRIPE_LINK = "https://buy.stripe.com/9B63cxewr3QW3w2bXG0sU00";
const TRIAL_PER_THEME = 10;
const ANTHROPIC_KEY = (import.meta.env.VITE_ANTHROPIC_KEY || "").trim();
const SUPABASE_URL = "https://vnctdsnfxvwvmkxqygaw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY3Rkc25meHZ3dm1reHF5Z2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDk1NjcsImV4cCI6MjA4NjgyNTU2N30.qGAMzs2doeMFo3HoIlp4ao2s-crYR2JoOL_A7xrRCm8";

const THEMES = [
  { id:"valeurs",      label:"Principes & Valeurs",        icon:"⚖️",  color:"#C41E3A" },
  { id:"institutions", label:"Institutions & Politique",   icon:"🏛️", color:"#2D6A4F" },
  { id:"droits",       label:"Droits & Devoirs",           icon:"📜",  color:"#C41E3A" },
  { id:"histoire",     label:"Histoire, Géo & Culture",    icon:"🗺️", color:"#6B21A8" },
  { id:"societe",      label:"Vie en Société",             icon:"🤝",  color:"#B8720A" },
];

// CSP / CR / NAT levels mapping
const LEVELS = [
  {
    id: "CSP",
    label: "Préparer CSP",
    fullLabel: "Préparation CSP",
    sub: "Carte de séjour pluriannuelle",
    icon: "🎓",
    color: "#1A3A5C",
    bg: "#F0F4F8",
    themes: ["valeurs","societe","droits"],
    desc: "Multi-year residence permit",
  },
  {
    id: "CR",
    label: "Préparer CR",
    fullLabel: "Préparation CR",
    sub: "Carte de résident",
    icon: "🏅",
    color: "#2E7D52",
    bg: "#EDF7F2",
    themes: ["valeurs","institutions","droits","histoire","societe"],
    desc: "Resident card",
  },
  {
    id: "NAT",
    label: "Préparer NAT",
    fullLabel: "Préparation NAT",
    sub: "Naturalisation",
    icon: "👑",
    color: "#7C3AED",
    bg: "#F5F3FF",
    themes: ["valeurs","institutions","droits","histoire","societe"],
    desc: "Naturalization",
  },
];

const LANGUAGES = [
  { code:"fr", label:"Français",   flag:"🇫🇷", native:"Français",  tts:"fr-FR" },
  { code:"en", label:"English",    flag:"🇬🇧", native:"English",   tts:"en-GB" },
  { code:"ar", label:"Arabic",     flag:"🇹🇳", native:"العربية",  tts:"ar-SA", rtl:true },
  { code:"es", label:"Spanish",    flag:"🇪🇸", native:"Español",   tts:"es-ES" },
  { code:"pt", label:"Portuguese", flag:"🇵🇹", native:"Português", tts:"pt-PT" },
  { code:"it", label:"Italian",    flag:"🇮🇹", native:"Italiano",  tts:"it-IT" },
  { code:"de", label:"German",     flag:"🇩🇪", native:"Deutsch",   tts:"de-DE" },
  { code:"tr", label:"Turkish",    flag:"🇹🇷", native:"Türkçe",    tts:"tr-TR" },
  { code:"zh", label:"Chinese",    flag:"🇨🇳", native:"中文",       tts:"zh-CN" },
  { code:"ro", label:"Romanian",   flag:"🇷🇴", native:"Română",    tts:"ro-RO" },
  { code:"pl", label:"Polish",     flag:"🇵🇱", native:"Polski",    tts:"pl-PL" },
];

const SPEEDS = [{ label:"0.75×", v:0.75 },{ label:"1×", v:1 },{ label:"1.25×", v:1.25 },{ label:"1.5×", v:1.5 }];

const VALID_CODE_HASHES = new Set([
  "307b4168f7f77d6a28483acf88702b802d8472ff6f3b75f97a8215eb24b08845",
  "efcf8a1aed717abb01fdc12ab2a4ffe4b617f9d25740c1965913556dfbb41528",
  "04084752038e1efbad6db7c5765392b59f22edfb983e18dff2c141dbd251795e",
  "98d97a92ca12558b7e1abe6e2443f5da9e31db32e75bc4a7f050973c84e8c363",
  "156654d7b3a6042c47b2dd30dd737973abc52c3b1fb66d5b394aefadea6361c2",
  "c13e8fd2355813836dd1a3ceb48afa8c6041419962f94308d70ddac81affd5fe",
  "71235b2c6e5ff4a82d72968ffacf0312b24d8e4487eb4bd9d206494a47b245bf",
  "3bfec61a10b535f306e453fce283dc99c8ea72d9f49ad5e6aa9b2fb037a1ee55",
  "19c69e6c19855953da25e6c617a7e36e61ecfcb95077284cc3a068a3ba67327b",
  "f89fd2ff96e3f9a8705cc09364ec83122ca4110b97ed2841f36b62acf15b8235",
  "4cef66e963e6384e027983737b7bea65435301fdea61202db74f8f0c684e8ace",
  "bceab2e2c88f326eaf0e99acddb09c048c0ec4e906b73ad72e5411fd89ce7d6e",
  "eddd06f31ce730cd8473f8a422993019a9db12bae6f6c892daae69794decc6b0",
  "d2a1e887b4c191272535508ac5a5beee50c23bd81f0990767dff17f97b025c1c",
  "b228be2eabdb50ad655af81afd03aa6272ce3ab230702430d5a8b9796ad81e45",
  "a1363e5832ee0f7bdefd936e7c85e0497cf6dddd40fcf587d005c77687a43b2d",
  "e1ecf052813924e9c98a604949d24fa88e87d77444e1857f8aeeee1f4462c6fd",
  "fa7e3663f636bc7371069f09ee5de5c5bb08154c4b0b0e9d19f6d228aa48d804",
  "e6931bbd3e99bf377a8ca741aecc7022fa47c8b821f056738e1c214de685f26f",
  "40f8d4bb503401f62fd1d1c827db7f68499c95e6f02cd8ad1b9d2d32f6b03a5d",
  "2def5b8c6210a57fe6ad6ff96fcfb0a10ecc5f308172349f69981b679b6b7aea",
  "b669a6575df117384a02df976c0786a00b0a712b8851410909c4113b10ec431c",
  "48775465f414fb5d8a9004d750070c79e041b07dab5d1c27466718233da8cdb6",
  "f4d75d09604e192bfd58d0468402fd40cdb5b60947f9332940384d3ffd1177d7",
  "b86c1fa43c940156bb9b83f5631565db0d92e283db6021cdbe342c5b3d55f727",
  "069120eccbf3718540be5cab89669ddc7b9e73c2e10951be86d5ab900e16263a",
  "9a29871574fecfef8f0553bbdba5795afb1c5ba3fe6139362f29cd24d9c831db",
  "68c8ea0c193248e51704287301a1856f01c2ebcc0443843f45df72c5de2e4ffd",
  "d777a8616217b6d3e42d5ebe4694df333401a351211444ac9fc41b30248ad691",
  "22c464d0cd1d5957c2136593ba00b87bdfc4ffb79bce9bf7c7ed61cedfcf9b77",
  "a0399bcf3e666d9523622f543bf62cfb969d25d3c274042b8f4fc9fc32ab7545",
  "366902ad401ef990adaa965244359cfbf6fc9b958f3d082b113617cd12e98318",
  "fca45c64e1c0eef430637f007e3c0ebf323bdc7b20c8d784df112eec3e7b0ffa",
  "1f1b5dd5610b2f6985ea67467b9e1d62ecf84c19a6a11da9ee948b56fd6b8222",
  "cd9dc4fcf9923871180b851756005222e78b97ac58c57abf1118271f6c584718",
  "9caae91b263945b60f925b1d801b692e1b7cfe246bfdd7561a52d5954828f427",
  "e180cc2f65d2ee1bf6114760b93be5b59967fd62a4d1c38564284f87b9f2aa14",
  "c701f724c561f967f7a00296d6cf32b5f0feb878de5f4d813dd76a8720ea1fb7",
  "5b1077205e4234166f574edf40ae0dfd429356f7741613d6040c514fa16d446f",
  "63f55e3026985a856b1340032805dd4a118761a75b6671d7e214f35b8e0ee34c",
  "9b5f3d13fce03b517cded1c9318fff468fe99daeb8cc6bc0e8172f66095c1ce4",
  "8f448de5dc1dcd8edc19ec696af2c4c820e1952a446a0af162e5cc6f9a5021c1",
  "ff22338a5ed93dc2c524d81ba0c0845c1b19ac6b13f1f12103bd7651a0942545",
  "597c180b7a671cf987820b01a3aca94830addff1fd26eef84401a5aa786b0b21",
  "02073489fe029f82152a583690c6f54bf95da5e7115b3a5bc87e99a059b5641b",
  "a4a5e29134fcfaa821cd4de587480df335a815e72013ea8429a2742e94ad17ee",
  "30b6500f1a307dda02b2a824526d52b7404687b8902fa5961a614687dfe8e1ce",
  "b727ae907aab62a08d1fc13936532e43d773132fc2ddcf6bfff4af5eb2574358",
  "cbe7da50c6098131ddec9d6a7e2e9be6591210fc2ac8e884878ad0addb41d600",
  "1ec52318ec04e7ae3f136be0c89258b1c43cfb59e8ff138da0d6db43032fafb4",
  "6a0d53615537ad93dd84c6c775cc2b69d3edc246a1a84e324c86c7f0ffe257ef",
  "518890ae7ee9bb82ce380656e18fb4f036f7ba2767d361a154da798da96041f6",
  "33530885b00d72d7bebb05a9b3cc247bde7a71c6d96b9587b376575b7a6359da",
  "f972c015f6a91dbdede0dd9000b013aeaf5a36fb65bf3ff9df52be32e0de8b87",
  "7898fdf243457fa130abc486c3ab0a66e4ee9df09d8c9c4b0ac8ecd5d56367f5",
  "a9565847a873b1640afdf13db9d7bc2b32a4a4fa4c2b8643fdea777c0fbba496",
  "a6084aef9faf543a179de0b993d1f84e11c6cc391e0a5982b558c5bb196c124a",
  "2619e9c6ca303ee61d453821890d5edc06bd2227197f79e0d121c345dffbc09c",
  "c1faaf9f5f25a79555e7917450e870d7c7147ef02ec2c99bfa100094c81ec8bd",
  "0465ab66cca2ad1e1371472435dfc6b454adc8a828df09fe83082608c76232fc",
  "f1f388a950be7bec21fed9412cb7c130ff7cfc2b3dd44b92f07cc0b100baf76b",
  "7b0e91fb8029e8c736f44fe21e022119f2e9bf598115fb17f4fe3df042cde283",
  "2d9f7a2e149a96a6235bfeaa3208b1c4581e7fb47491dbc9a6aad3ab0a7ff5e8",
  "04da05174307d3f0f7693ee1cb6730fb693d9984b420a84132f314ba2be4aaca",
  "9051e7743406d015609c77040e9aedb91962c97ea0adbfe44aaa44aaf8be4ea8",
  "1f159b137f9c7b09616bd26fbfb7956f547df07a4d8ac369a293dcb4cf7193b0",
  "fcf9198fac63ae8454598da48da695c4f390846a26349a446c23157abd73a583",
  "c6266d717dd9d0db2f3d11aace22418f758d901b31973d462d5ab45363f889ca",
  "e44da0c29916ecbc10fa648511fc9231a7606a0c4efdc2689ba40fb909d4d306",
  "c442de8812e7e55269742b974499892a771587b5418566afc29b184b792b41ad",
  "74f20856fa1abe1478df89f71dbfa4f4daffba7a56bdc6a0d0a82294b7cc533c",
  "4b5011d8333b1db52b76203c74892a2ac73866c4ecccb1650dd15617c53f76ae",
  "9af68986e64b2cd0c553917b2ce99b791618c60ff494b1a698cd87d921884601",
  "e4b8c79e9e4b2edc296fcada19d222d73a24d1f8490404519409abde560cf6d4",
  "92916eb58388ceca926ca38e55c29c8882d1fe6d261b82c7ff28cc5dea7d402d",
  "3847fc14b5eb31a88c7eb15f69e5e9505dc3fc0cd16fea16727182c5c065eb79",
  "bf868df92823a866912f122967cd19ae0b13c2fb58c037c20270bb037d601bba",
  "39f1032d06729ea26100fcffe7052ad4c07b4f7769840edb15da9047c94cad5a",
  "0b104f6badd758c70d53834dc35c98201ed503d2fbfdf20c894e57cb0c506f11",
  "fffde3730b9467bc5174ff359074d11740e6a37eab4058500c31813aa5f141be",
  "9e209cf0ae14d9659587ba226e20989b8c513135eb039ab202e8a327bf2ce84c",
  "89d03b204fe58c6b87fdaf7822237509cd3f67b9c43f930363d64ecc18e7b892",
  "7979fd403ef6545e852cd867c03e2ed0fe454e5253865172882f4f9c0df14570",
  "298fd45b66abdbfe13a588cf768074b5a8e5c055b1d46f43d98c9579819c412c",
  "cbf41b5b159d857e204b1b7df269b1dfd41f2331bd1adb9b8d95bdf8e854f289",
  "cb85b51735ec0752fb875271979986b744e13074c864d462393b12fbee035ed0",
  "4168af5d19667edf9897b0c25c31616837110c2e2f1aeea7450753b769b098b1",
  "4bca9e1dd2a4c32921aa85167b82ca2c6344e05ddf4e61dd69253af571e26826",
  "f0f79bda6c97b0b34732831dc39541c876d5eaa7f1c42cea33cc279f8157b5bd",
  "0f8eb9a5d65a7c6d699485f9a60875be6345f32cb33ea9dc6ead278d9c46a4bf",
  "ea9de899606a5cfdf1ba81bc3f80d29e0e7adbc22df8a5b9e2d665fa29e6431e",
  "1c707b9afed82c079c09dfc972d09a79ee210bc92c6c97caa86fc0205c6bafa3",
  "5b8e240adfa1b3b2eda8f3cf7d7b2d576041ad266506b81f1505399704e75833",
  "f4e3e8625d60908b82f1761894efac4c670bc90b5810ea35fce9009117010c12",
  "80ec4107069eae9b8f60c28ec7ed7f4cedcf4a17ea05c107087338f6dde7bbbf",
  "757423511132097ac60d7f9bc0dea88ff489f07cbcbe440e0733dba0d93b5cf6",
  "60c86b2820f60c6e491fc62bc64cb8430a7e50a74d6575da76128b264dd21922",
  "f5fe30c9a1ede8dd97ee6a5b1c03b846d1dcd565a7030f269bfcbfc373519310",
  "769de215ddb4e3e67245dca935741466c93dec512202d9ec1dd3528d5f5b853c",
  "5877e69090ca419c3d7f0a654f6caa03d81cdad446736c64905ed089813c409a",
  "56082d5d9c319fadca327215b54cbc330f48841366da3ebe6664db03d16ac0f7",
  "4dd263969185e30eed8ee6c999ff9694a74b4850b11c84ffd229bdc1aeee4369",
  "3faf6d47ad800b8c1f71e8824f1ee94125ae8efcb1a0414c6e5f44ff5b006733",
  "2d6631aa4ac56242800d0174f6aae8974f53f6a45bfa4773aefe7706ded70150",
  "7bbca00718a55c44e54ea0b553eec3bdf031bf8b1758dd8dda2b3b987a052d3a",
  "50fc2f16f9cf2d28109dfa18717b1d63a4a85b8969cb0ebcd62fd5b3b0638b46",
  "2250cfbae390049af2f762422b58d896680093d21e7f2c2bbdfb19c19279c1c3",
  "bb0250b33e2e86d223bc8336be30ce1470bbacaf09fb24b9b61e1b902806abd7",
  "fb61d70d3598a46cbbaac7bd8562ee28a7450e917b42cf927caebb9c23161e96",
  "e28c953a7071405352a1f9a4be72a0f2753d6b1e31ddd55afdd651b323d1e3b5",
  "198bbac26ae2057fb23e66069fe0294ff068a7f59383d58439d447268210627a",
  "ffa6f266e578b8e358b2f36e758f7d8f3b279d446dfe0867fc02a581a2d4f3b3",
  "569a47cc36af1229e4d97817428e2318eb527d3db8921f0e2eee19342acb3ce9",
  "5f098d69e5d649279c0d0e37a41d219bd9608646eb937c8a8cbbae2e17928c09",
  "dd6632a3b7fd7b4987eee94b816b942170e17e88dd7e27524ad1cb780f6e0ba5",
  "a82f17ebacdf55e408de5c0425a14084778129b0ae096a4a24e5ffd6c8b06a66",
  "dc4a45625bbc0d35d38f9c0e0824e29777b9dff5e99ab6c7c9bf4cae09a0c5cc",
  "afd2f858496b6860330b8dae2a757c1047f99fb891e7b5967a08df06143abd12",
  "60c9082e409fa4fbc2acf64eff99b48b9da37875b83172a58a1cc7d71eff0214",
  "7030812746faabb2396bf93c110598e72c74b62bdfa2b52617bc0e5ab3dc9f6b",
  "8a9ee84d39631688a72ec30cd2768daebf4211412087420bc7bc47b486f25150",
  "38b896d0cf30dae6d248e6763d8b843911740ac2576ce96d8465885f1ca7e6fd",
  "fe25d6ff3a12620800f332aef96da2f39c4c4b15e3cc4f63f9cebc3ddc2a7a4d",
  "eead8587b46b1d6c01658ac08b952a390cdf910245cb61baa7a88cfc86efb5a3",
  "4a6332269e82a2e4a0f726a4faf08b1b210c27c591f3d3c59d978b4a404380da",
  "deb518c2e329ef3d07c7cec6169b196c97cd5bbedda511e6ed2fc2208043e18f",
  "a3a855758447d60d620a5259ac38326d6280055c184ad32efd29812b5b7916b0",
  "f329730e7e3570a3c340607cb97d0c2422c894d00355518d8246ee877bbe3dd6",
  "1f3963774e9ce2eccc698fb6545b6bc00fad099c8d613c55aa78b473c7d7af81",
  "794755c74be0beba94c82ac1bcaec58630df70727d09db9d89823b0dd1d574e3",
  "f5a5653d7b8fad63ca4bb4447be9b449357ca3ea57bdeef0b452c921c6a5c393",
  "28b3cea8e36aa362df043ff2f8a30c1aeb988ac1a549c5f79588f780d61f7ea7",
  "48dfa0818cb646529098ddeb8e92f14eff661b3b7bf0f0c72504a1a7836704ad",
  "86b21b473e053a52769b5018ab27604ce36bc1f8141de9aefe0fd3a6e3ec8330",
  "a996974fb262b7724cbc8e12ca204f517aa635d6e7330504dd1b6b2f3fec3abf",
  "16dd37c192eee779e9f650b3cb999608eb3e454f53378aee91ccec3109c258a2",
  "1bd9bab634fcd8bc449adb5f5f4294e7ad35a16ce8ddca2e9a8e8dbd680fe33c",
  "827d3c6ff090237c1f994775489e6fa84ae0c47b913b52635aa306e26cf380a8",
  "17e4e8716418dfbf964faf2cb2a51ef5bc29cfd58c597139fe7f542c09e1c90f",
  "72155ac18835e6015b72c34b8e9e18dd228af00c0e31bbe337092061c28903ce",
  "65970777aa647f90fba791b182e49709ede2691b8bcd7f4b079993dc3f1f370d",
  "43caf4f0dd1bd776a3285abc1566c437fcc4187df25a861b70ab3f1a474d3969",
  "779975689c12b2d81c1362ffa7d327d03e847a918874398a83076581ca69eb21",
  "1198124c69df21bf0031ab62466099738d0b29581f570dac23352c4359fc4d3b",
  "a1e11871cad02d0ce895d6b1dd1176e99d5b8371345c7c41120fbe679badcb3c",
  "926b6686980f8df008c68fedfad654d11a3ac4fbcb7239ba0f2876a1e9905ef8",
  "beaa2ac50f32889b1f5d0d77321d9d2c1a84b132dc88fd818a69121f3715f592",
  "c68aaaa34080e015fc0a6ea665c3c0cdb3c45349f91cc4d60ea77957bdf86132",
  "0d0d01f7bee4c6b3f82c76a74581e5e97d4c9e6e5676e48b3c6ade0d35ca3eea",
  "05a67866d6ec2a6889ac35455acfc33cbe6ca0c93b9f382cecd8f0114ebec31c",
  "0deab5adec52435e6353ed59e32545165a9632d00da1d14c22cdd403ce20ccdf",
  "8d57ec50752ddaefe462f6aaec147346fe25b6be4c82d2cfa08717da025ed5dd",
  "5ebe55d6c792003b8a60a65598b44ce611eafd70986964a604beb1c93d6f3c3e",
  "4cf297f54fe80775d812c481965555cd9a5c9f5032a8c1a241181170cf2cc76f",
  "d4f04ff855859db466eed4a9aef3ed13d308e3369d9e54ff04f179b3a52e8df6",
  "cdc719f1a535e7b0646ee30c46484945ce5c4c5ecf3fa7a54e6f5dc0f9500452",
  "05d80af72eca3e760e2d70a43b6d3f57d1b74d926ebff4d89adb50b79082ebc5",
  "655518f6c717cb6d9c5942691c08fc3a08bbdf37482d2871c96dc18c295c90e6",
  "34c723d7d4b7846941054f1da1c58bf2f464f2f2b56f3938fdb631fd809f2e29",
  "b894478b3521f9afb90166cff32b7bbc4e3f3bf24e7ce862dbe39150d10b8ea1",
  "34ca286b86ac6109237ac8905c6287a12ff7ddb0610a3a9946e5da02cbf58b69",
  "fa7e665acfdf0a7f1e05648b7bbef4e536d0bd9d0e7ff188f62b5dc308de8bf9",
  "1d0d8b821a52d0ec7050f05201a2763e2813fc88b081a12cac33a53dcf1c582b",
  "e589571587f2fb1a3653e3868d179c3037068d823647a3b6d522a350cf817717",
  "b605c909eaf0824cb90b5dd1c51ff12977f8d412c7efbbe132410d066d81d4c8",
  "16a5a7a67573b795aa9ed2a59215e9e2ae8679fcb89c355b47df1a11002443d8",
  "80399c4ac80caae4dc60d6f292ce8dd865f66cc585bac30e832b7fa2b40a8dba",
  "4a813d3ae0e0b5725f34149b8ad022f09fcdedbf7fcdc94ada379dc8a60619f3",
  "156140aaf4002d7fddda0ff3e74b187081fc1672b6414623c05aae6d01f50596",
  "014a52cacd89557f1a691f36f592a0f53acd94b4042fc10f0cfcddd4467d753b",
  "5367ae0ad317f2a71b12fe88eada59e4ccb61c7524a0b9d44e529aadbdc68686",
  "a22d4b03a5dacdea7ab821f47478ef267589dd9981d6a7019160d64596101dba",
  "a3fa84060e5b1ae15654397354e4559b5af5a050abe3d664f4295f31ddf99e3b",
  "3320e1544696dfec35211399e4a32171820996754666d3373438dfbec0879193",
  "134d887a64d4542f68a310928f4060c8001107252048ca175c56a723e720b73b",
  "d80ce57e8aacb8332f13f323d346052d3c11fdfe859848a14e6fac3e37791e1d",
  "5d756a0bee08543da3558190edbeb2ca155b30081c5bad616d336c2c93970241",
  "4b1a2fc4295f57bd4b4a301142024f5d9c2d51de272de61ff14b973deb81b4de",
  "d7d1b5b8f3dbd2e3e672d28cc53f79549c1b117894009bfe36680d75120104fd",
  "d37424ea3e69612a3b8d56bc82b0ac727bf2da9be6d90051a6c2142701a60043",
  "d83426a6cd9e49e74ea9c23030b974a9126b284987a73e1f0342c54e9c177fdb",
  "eededd563323a20f93e53291cea18daf29d0d6bf1cb1fff982b942538bd46bec",
  "5633f036b78374f4750947bcc602bdbb6f8a65f85522dfb6a8721230467d28db",
  "bc1c3be5effc1d91f97c5a7f5254e03c7f5e331c7e2080e02f5296d68eee1bfc",
  "5a3b8c646369e99a11ee4da07b6d49be3e90108678f17322dc8d33103983089e",
  "2afce2fc09317c10d6d9ee7f31498957180be41866afe15487a474426414554c",
  "753d1bc5e56303468a0253f3c712c43bde8227c5a5fad46811031f5c6f0e1285",
  "2f3b716fd1f43511882fea03492509dc0afd4c8574c3eb2b126ae30a8470ea04",
  "428b10721c7c980ea38921c01455b82682ad2bf54a2053cb5817b9d16126349e",
  "eb823533271e2db66d09abdc16129b214b20cd852cc79cd5c0eab7b1d66d54d0",
  "f01e408e1b9d317a79e4ce82b1856d0424252baaccbdabd18c5e43eeeb2a1272",
  "9ea2eec7781240305bdb1aaac2998da9a3af4cda8e3d84c65c03ece7b5a7ec0b",
  "88ee989642d79ff284387bbf2531b0dd81a93f16e4b99b0df5b467d4ecf15878",
  "791ff0ee4b45e44e8609a0e50f2b7294d9a9a907ef3572aaa6760700540fb5f7",
  "ea6a59916e2b5d4e1ea5aa9e0b9924a276c1e2beb551ea12beb6a8c953ad0125",
  "927ca23e1585d1fb0c0017c1ed66537d315924203705ca6e90cb91c087ce5912",
  "aa9a40ee8a7b72cba6d5b9ef00bccc1152648105be628c3a0f018959f9057df9",
  "fbafa4ce5871ea2019461aa66346b8d1225b376e4ecd96debd74616cfc3936ee",
  "c7459531c1771a85c7cdd7537896b247c33ecbe2f26066e0fbdced5cb399ff7b",
  "6c2fba1a2d7b438fd955050a29a405052901f686c6d8e68a4150b64be4d97dad",
  "02ec9f57ce45083668a24c297cad8236fa200429f85746263c0b9ef3e9caced4",
  "ca53eb220d0843c53d451fc1cda92c3febbfd9146c7ffb1980234ebdcccec20e",
  "1d16cf1e72b71a60e8869f5732e00f6b4ee5eb817fd6aca887980a306969b133",
  "155aa7839083b3f74f13c6f4ef912acb705832e4d394009e1177570da29c101b",
  "11eb3a05c37c14fe090b5b5db389f658ec130058dd18846e91c28651724a6bd3",
  "a195a1971b65918f164798e8f77a0ac82a20ea695b198949e3b131ad3649dd13",
  "dc928f5c849712cf71a62d7a3fb5078200b1b2fe81f6d56c0cd91029a479cb88",
  "f4f69c7dc528c8bc921cb035a386f60d22f6cc296cdded739bde97e59c94da80",
  "0da121def35217b5bcb7d4d29dc08afb00dad4d4a03951a38a608151bcee8837",
  "0854ac273516b986c854dde6ae109f593fabd8d7b34ef3eb88e02ef6009ac0c1",
  "f9c8a4b245f22551c16abc6edf38e76b12a649106d929b99165cb2b4a5254c85",
  "1e7fb61f37af02ec4631ba1b83514558afeefed5c12a48ec23e20d82e598a97b",
  "cfd78214d17451364804d2070f2916a54e240e5283ef9b00d7337934b47d998c",
  "3904987eb527dd55e94f6454d6d6b4253582b321d1d1d6fd53d24a0e11279220",
  "2d0656d1e90bdcdbe46d2c955ea055c8ec3157fbca36bf28b29083b61e8accb6",
  "1a9117a592df08291af2e26d464e201f18dfd64f5ce7da108f16a44f2ebb67c2",
  "ec316ea673043672f1db95b5c2d64aaa6071cc4b5685b17613ccd007c2b1d1c2",
  "d8ba8b4fbe7bd5fbf1a3e0494d4a1c67fc74459238d27e6bdd84ce27d5f896fd",
  "64c474cbc478804e0aeb98b6b4b67578b1d67f6d997da7891bb24804324f3fca",
  "9a138770986d03c26b77ac97aec8e8aec2a90a2f683ea20fce10209f9b9fee9f",
  "68fd6c80f8b01e24d1a5d74de9c951eb2539943d0f455d5fc933b3bb2012ee3f",
  "0bb59205bb82585f1f481510b324079e11d2d6d849cd5b2f794fc3932d143133",
  "9fda09a0e3b09a37ab93c511fb547374c05a695427d58ebfccab584fbec9ae57",
  "b293f9a6c3ea35f658fab3ae4a14726cdc26655ac37a07e594652ea44bcd9160",
  "c7a2e5d424d632b9276bbca600a5e953f70a3991895d5c31a9768ab39ac61f19",
  "52ec48da55f7ef60155fabe3de43c7d829d1d30b0c2e123f8052b73e508ca89a",
  "1ba6746cd62193daad8beee9a5e00d731a0086de20666069f639e5219a8d8619",
  "1e7417a3c4d4c2b5f9e92973b1d8df6836142f1a3541c3b0c7ea094e524b6ae6",
  "c3e57545cc5323ca8bea1f1d436b78b862ed2dc76bfc2be36b1d51916c904416",
  "e486b8ea8a1ef711eaa6512dea470f520cf05a94f2b9602accfe6a582dc48473",
  "7d1b17181502b2f5c762288c8e088e01908f672bf52278e8dcab8365cde40f56",
  "8c5444d2e28d7f869129ac31c2b025fa9f2c9a6439714ff47eed33f1d64a5c37",
  "a124e519a3d1efc57d45ec05a7f38852fb39c51867b89977396bd2071ede2c47",
  "cb1c2a81606fdfb17e30d5b4f19e055848c7b7dbfddff44b1a9ae0daae3284a2",
  "ffc0b774e4034ffa5c90f1f1afd8a5576774b31bf2f285ba93f9cafe48dbe6a5",
  "545f7c16167d11759647f1df0bb54205fec7c720bc9719fe40b8bf8faf24a65a",
  "16c9481f4cc60a19b5e1ab18faec93f9bd65fc051e00e00699ab802e9f8150b3",
  "3b87e446ce6c845a8868ab9834b47ff3291847095a99f79324857e5075ad6e7f",
  "9044ac2f14fa7c3d260e04dd7574ba8df099a14b674d9a3f5750e0242b7296cb",
  "109f3b18ee461c3b660369f5c217fd3c9b46992a6748f17412727d24792b3bd5",
  "61c7e6931c764151b0d0a80b56c4874cc1c8b52f117b63842ad4713550479258",
  "a70fb94f497d7f1cf19252d617d0fc364ab80904334dc4ae9c0080ba61ca5f62",
  "9e442966b8099ee96882f12c7d544e3ece67d508a146146282316a28a66d37ea",
  "9ed05c96f5a58a3b30eba3a45727a2d1a34f3b69fc949e0980d1d733eebc9bcb",
  "7d4235072d2bf6a5c079cb7e995d995dfdc8959a1575173f353672357519858a",
  "024aba7548d87655a848c7407a44d245f7fd4a62a346c28744e66722bf08f643",
  "da4eed797ce01df5f1712cfd01b7c9d03cd9e25ad2e5d1c0236868d6dd4c1d48",
  "b568ed77950ba49b36fae944d33c4346c63e38c4d61e298cf155cbe4b83be25a",
  "329997db2105901f6961e6dd73d064b764ed07f015a2aa3cc05a5e1cf6b169f5",
  "bcc29087ef9e9dbbd8bd1c359d95d5294ba55f713a70a90f5af97dca5f0efd76",
]);

async function validateCode(raw) {
  try {
    const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const buf = new TextEncoder().encode(normalized);
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const hex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,"0")).join("");
    return VALID_CODE_HASHES.has(hex);
  } catch { return false; }
}

const BATCH_SIZE = 5;
const TRANSLATION_ENDPOINT = "https://api.anthropic.com/v1/messages";

async function translateBatch(questions, targetLangCode) {
  if (!ANTHROPIC_KEY) throw new Error("Missing Anthropic API key.");
  const langName = LANGUAGES.find(l=>l.code===targetLangCode)?.label||targetLangCode;
  const payload = questions.map(q=>({q:q.q,c:q.c,e:q.e}));
  const res = await fetch(TRANSLATION_ENDPOINT, {
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${ANTHROPIC_KEY}`},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:2000, temperature:0.2,
      messages:[{role:"user",content:`Translate these French civic exam questions into ${langName}. Return ONLY a valid JSON array, no markdown. Keep numbers, dates, proper nouns unchanged. Structure: [{"q":"...","c":["...","...","...","..."],"e":"..."}]\n${JSON.stringify(payload)}`}],
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Translation failed (${res.status})`);
  const data = JSON.parse(text);
  const merged = (data.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
  const parsed = JSON.parse(merged);
  if (!Array.isArray(parsed)) throw new Error("Bad translation response");
  return parsed.map((translated, idx) => {
    const original = questions[idx];
    if (!translated || !Array.isArray(translated.c) || translated.c.length !== original.c.length) return original;
    return translated;
  });
}

function Waveform({ active, color="#fff", size=16 }) {
  if (!active) return null;
  return <span style={{display:"inline-flex",alignItems:"center",gap:2,height:size}}>{[.4,.9,.6,1,.7,.85,.4].map((h,i)=><span key={i} style={{display:"inline-block",width:2.5,borderRadius:2,background:color,height:size*h,animation:`wv${i%4} .8s ease-in-out ${i*0.09}s infinite`}}/>)}</span>;
}

// ── PAYWALL MODAL ─────────────────────────────────────────────────────────────
function PaywallModal({ reason, onClose, codeInput, setCodeInput, codeStatus, handleCodeSubmit }) {
  const reasons = {
    quiz:   { icon:"🔒", title:"Essai terminé !", sub:`Vous avez exploré les ${TRIAL_PER_THEME} questions d'essai de ce thème.` },
    listen: { icon:"🎧", title:"Fonctionnalité Premium", sub:"Le mode écoute complet est réservé aux abonnés." },
    lang:   { icon:"🌐", title:"Fonctionnalité Premium", sub:"La traduction en 11 langues est réservée aux abonnés." },
  };
  const r = reasons[reason]||reasons.quiz;
  const statusColor = codeStatus==="ok"?"#2E7D52":codeStatus==="error"?"#C0392B":"#C0392B";
  const statusMsg = codeStatus==="checking"?"⏳ Vérification…":codeStatus==="ok"?"✅ Code valide !":codeStatus==="error"?"❌ Code invalide.":null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:12,padding:"32px 28px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,.18)",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:16,background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#9CA3AF"}}>✕</button>
        <div style={{fontSize:44,marginBottom:10}}>{r.icon}</div>
        <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:"#0F1923"}}>{r.title}</h2>
        <p style={{margin:"0 0 20px",color:"#6B7280",fontSize:13,lineHeight:1.7}}>{r.sub}</p>
        <a href={STRIPE_LINK} target="_blank" rel="noopener noreferrer" style={{display:"block",background:"#0F1923",color:"white",borderRadius:8,padding:"13px",fontWeight:700,fontSize:14,textDecoration:"none",marginBottom:16}}>
          💳 Accès complet — 5,00 € →
        </a>
        <div style={{background:"#F5F6F8",borderRadius:8,padding:"14px",border:"1px solid #E5E7EB"}}>
          <div style={{fontSize:12,color:"#6B7280",marginBottom:8}}>Code d'activation</div>
          <div style={{display:"flex",gap:7}}>
            <input value={codeInput} onChange={e=>setCodeInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCodeSubmit()} placeholder="CIVIC-XXXX-XXXX-XXXX"
              style={{flex:1,padding:"9px 11px",borderRadius:6,border:`1.5px solid ${codeStatus==="error"?"#C0392B":codeStatus==="ok"?"#2E7D52":"#D1D5DB"}`,fontSize:12,fontFamily:"monospace",outline:"none"}}/>
            <button onClick={handleCodeSubmit} disabled={codeStatus==="checking"||codeStatus==="ok"}
              style={{background:"#0F1923",color:"white",border:"none",borderRadius:6,padding:"9px 14px",cursor:"pointer",fontWeight:700,fontSize:12}}>
              {codeStatus==="checking"?"…":"OK"}
            </button>
          </div>
          {statusMsg&&<div style={{marginTop:7,fontSize:12,fontWeight:600,color:statusColor}}>{statusMsg}</div>}
        </div>
        <button onClick={onClose} style={{marginTop:12,background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",fontSize:12}}>Continuer l'essai gratuit</button>
      </div>
    </div>
  );
}

// ── STATS CARD ────────────────────────────────────────────────────────────────
function StatsCard({ label, value }) {
  return (
    <div style={{background:"white",borderRadius:10,border:"1px solid #EAECEF",borderTop:"3px solid #1A3A5C",padding:"20px 16px",textAlign:"center",flex:1,minWidth:100}}>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:8}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,color:"#0F1923"}}>{value}</div>
    </div>
  );
}

// ── SIDEBAR NAV ───────────────────────────────────────────────────────────────
function Sidebar({ activeLevel, setActiveLevel, screen, setScreen, isPremium, stats, stopAll }) {
  const navItems = [
    { id:"home", label:"Accueil", icon:"🏠" },
    ...LEVELS.map(l => ({ id:`level-${l.id}`, label:l.label, icon:l.icon, levelId:l.id })),
    { id:"french", label:"Français", icon:"🇫🇷" },
    { id:"profile", label:"Profil", icon:"👤" },
  ];

  return (
    <div style={{width:220,flexShrink:0,background:"#0F1923",borderRight:"none",minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      {/* Logo */}
      <div style={{padding:"20px 20px 16px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>📖</span>
          <div>
            <span style={{fontWeight:800,fontSize:14,color:"#1A3A5C"}}>prépa</span>
            <span style={{fontWeight:800,fontSize:14,color:"#0F1923"}}>civique</span>
          </div>
        </div>
        {isPremium && <div style={{marginTop:6,background:"rgba(232,184,75,.2)",color:"#E8B84B",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,display:"inline-block"}}>⭐ PREMIUM</div>}
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:"12px 10px"}}>
        {navItems.map(item => {
          const isActive = item.id === "home" ? screen === "home" && !activeLevel
            : item.levelId ? activeLevel === item.levelId
            : screen === item.id;
          return (
            <button key={item.id} onClick={() => {
              stopAll();
              if (item.id === "home") { setActiveLevel(null); setScreen("home"); }
              else if (item.levelId) { setActiveLevel(item.levelId); setScreen("level"); }
              else { setActiveLevel(null); setScreen(item.id); }
            }} style={{
              display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",
              borderRadius:8,border:"none",cursor:"pointer",textAlign:"left",marginBottom:2,
              background:isActive?"rgba(232,184,75,.15)":"transparent",
              color:isActive?"#E8B84B":"rgba(255,255,255,.7)",fontWeight:isActive?600:400,fontSize:13,
            }}>
              <span style={{fontSize:15}}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Unlock banner */}
      {!isPremium && (
        <div style={{margin:"10px",background:"#0F1923",borderRadius:8,padding:"14px 12px",color:"white",cursor:"pointer"}} onClick={() => setScreen("pricing")}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>🔓 Débloquer l'accès</div>
          <div style={{fontSize:11,opacity:.7,marginBottom:8}}>{ALL_QUESTIONS.length} questions · 11 langues · Audio</div>
          <div style={{background:"#1A3A5C",borderRadius:6,padding:"6px",textAlign:"center",fontWeight:700,fontSize:12}}>5,00 € →</div>
        </div>
      )}
    </div>
  );
}

// ── LEVEL DASHBOARD ───────────────────────────────────────────────────────────
function LevelDashboard({ level, stats, onStartQuiz, onStartMockExam, onStartListen, isPremium, checkPremium }) {
  const lv = LEVELS.find(l => l.id === level);
  const levelQuestions = ALL_QUESTIONS.filter(q => lv.themes.includes(q.theme));
  const levelStats = stats[level] || { answered:0, correct:0, exams:0, scores:[] };
  const successRate = levelStats.answered > 0 ? Math.round((levelStats.correct / levelStats.answered) * 100) : 0;
  const avgScore = levelStats.scores.length > 0 ? Math.round(levelStats.scores.reduce((a,b)=>a+b,0)/levelStats.scores.length) : null;

  return (
    <div>
      <div style={{marginBottom:6,fontSize:13,color:"#6B7280",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>
        ← Retour au tableau de bord
      </div>
      <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:"#0F1923"}}>{lv.fullLabel}</h1>
      <div style={{color:"#6B7280",fontSize:14,marginBottom:20}}>{lv.sub}</div>

      {/* Stats row */}
      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <StatsCard label="Questions répondues" value={levelStats.answered} />
        <StatsCard label="Réponses correctes" value={levelStats.correct} />
        <StatsCard label="Taux de réussite" value={`${successRate}%`} />
        <StatsCard label="Examens passés" value={levelStats.exams} />
        <StatsCard label="Score moyen" value={avgScore !== null ? `${avgScore}%` : "—"} />
      </div>

      {/* Action cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:24}}>
        {/* Practice */}
        <div onClick={() => onStartQuiz(lv.themes[0])}
          style={{background:"white",borderRadius:10,border:"2px solid #0F1923",padding:"22px",cursor:"pointer",transition:"all .2s"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{width:40,height:40,background:"#F3F4F6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📖</div>
            <span style={{background:"#DCFCE7",color:"#166534",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>1 test gratuit</span>
          </div>
          <div style={{fontWeight:700,fontSize:15,color:"#0F1923",marginBottom:4}}>Pratiquer par sections</div>
          <div style={{fontSize:12,color:"#6B7280"}}>Entraînez-vous sur les 5 thèmes de l'examen</div>
        </div>

        {/* Mock exam */}
        <div onClick={() => { if(!checkPremium("quiz")) return; onStartMockExam(); }}
          style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"22px",cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{width:40,height:40,background:"#F3F4F6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📝</div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{fontSize:11,color:"#9CA3AF"}}>26 examens</span>
              {!isPremium && <span style={{fontSize:12}}>🔒</span>}
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:15,color:"#0F1923",marginBottom:4}}>Passer un examen blanc</div>
          <div style={{fontSize:12,color:"#6B7280"}}>Simulez l'examen officiel (40 questions, 45 min)</div>
        </div>

        {/* Listen */}
        <div onClick={() => onStartListen(null)}
          style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"22px",cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{width:40,height:40,background:"#F3F4F6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎧</div>
            {!isPremium && <span style={{fontSize:12}}>🔒</span>}
          </div>
          <div style={{fontWeight:700,fontSize:15,color:"#0F1923",marginBottom:4}}>Réviser mes erreurs</div>
          <div style={{fontSize:12,color:"#6B7280"}}>Mode écoute · Questions + réponses + explications</div>
        </div>
      </div>

      {/* Progression by section */}
      <div style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"24px"}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:20,color:"#0F1923"}}>Progression par section</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:20}}>
          {THEMES.map(t => {
            const themeProgress = (stats[level]?.byTheme?.[t.id] || 0);
            const total = ALL_QUESTIONS.filter(q=>q.theme===t.id).length;
            const pct = total > 0 ? Math.round((themeProgress/total)*100) : 0;
            return (
              <div key={t.id} style={{textAlign:"center"}}>
                <div style={{position:"relative",width:72,height:72,margin:"0 auto 10px"}}>
                  <svg viewBox="0 0 72 72" style={{width:72,height:72,transform:"rotate(-90deg)"}}>
                    <circle cx="36" cy="36" r="28" fill="none" stroke="#F3F4F6" strokeWidth="6"/>
                    <circle cx="36" cy="36" r="28" fill="none" stroke="#E8B84B" strokeWidth="6"
                      strokeDasharray={`${2*Math.PI*28}`}
                      strokeDashoffset={`${2*Math.PI*28*(1-pct/100)}`}
                      strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#0F1923"}}>{pct}%</div>
                </div>
                <div style={{fontSize:11,color:"#6B7280",lineHeight:1.4}}>{t.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── HOME DASHBOARD ────────────────────────────────────────────────────────────
function HomeDashboard({ stats, onSelectLevel, setScreen }) {
  const totalAnswered = Object.values(stats).reduce((a,b)=>a+(b.answered||0),0);
  const totalCorrect  = Object.values(stats).reduce((a,b)=>a+(b.correct||0),0);
  const totalExams    = Object.values(stats).reduce((a,b)=>a+(b.exams||0),0);
  const allScores     = Object.values(stats).flatMap(b=>b.scores||[]);
  const avgScore      = allScores.length > 0 ? Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length) : null;
  const successRate   = totalAnswered > 0 ? Math.round((totalCorrect/totalAnswered)*100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div>
      <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:"#0F1923"}}>{greeting} !</h1>
      <p style={{margin:"0 0 24px",color:"#6B7280",fontSize:14}}>Choisissez votre niveau de préparation pour l'examen civique français.</p>

      {/* Global stats */}
      <div style={{display:"flex",gap:12,marginBottom:28,flexWrap:"wrap"}}>
        <StatsCard label="Questions répondues" value={totalAnswered} />
        <StatsCard label="Réponses correctes" value={totalCorrect} />
        <StatsCard label="Taux de réussite" value={`${successRate}%`} />
        <StatsCard label="Examens passés" value={totalExams} />
        <StatsCard label="Score moyen" value={avgScore !== null ? `${avgScore}%` : "—"} />
      </div>

      {/* Continue preparation */}
      <div style={{fontWeight:700,fontSize:15,marginBottom:14,color:"#0F1923"}}>Continuer votre préparation</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:28}}>
        {LEVELS.map(lv => (
          <div key={lv.id} onClick={() => onSelectLevel(lv.id)}
            style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"18px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#1A3A5C";e.currentTarget.style.boxShadow="0 2px 12px rgba(37,99,235,.1)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E7EB";e.currentTarget.style.boxShadow="none";}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:8,background:lv.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{lv.icon}</div>
              <div>
                <div style={{fontWeight:600,fontSize:14,color:"#0F1923"}}>{lv.label}</div>
                <div style={{fontSize:11,color:"#9CA3AF"}}>{lv.sub}</div>
              </div>
            </div>
            <span style={{color:"#9CA3AF",fontSize:16}}>›</span>
          </div>
        ))}
        {/* French practice shortcut */}
        <div onClick={() => setScreen("french")}
          style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"18px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#7C3AED";e.currentTarget.style.boxShadow="0 2px 12px rgba(124,58,237,.1)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E7EB";e.currentTarget.style.boxShadow="none";}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:8,background:"#F5F3FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🇫🇷</div>
            <div>
              <div style={{fontWeight:600,fontSize:14,color:"#0F1923"}}>Pratique Français</div>
              <div style={{fontSize:11,color:"#9CA3AF"}}>DILF · DELF · DALF · TCF · TEF</div>
            </div>
          </div>
          <span style={{color:"#9CA3AF",fontSize:16}}>›</span>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]         = useState("home");
  const [activeLevel, setActiveLevel] = useState(null); // "CSP" | "CR" | "NAT"
  const [isPremium, setIsPremium]   = useState(() => { try { return localStorage.getItem("prepacivique_premium")==="true"; } catch { return false; } });
  const [trialUsed, setTrialUsed]   = useState(() => { try { const s = localStorage.getItem("prepacivique_trial_v2"); return s ? JSON.parse(s) : {valeurs:0,institutions:0,droits:0,histoire:0,societe:0}; } catch { return {valeurs:0,institutions:0,droits:0,histoire:0,societe:0}; } });
  const [globalStats, setGlobalStats] = useState(() => { try { const s = localStorage.getItem("prepacivique_stats"); return s ? JSON.parse(s) : {}; } catch { return {}; } });
  const [codeInput, setCodeInput]   = useState("");
  const [codeStatus, setCodeStatus] = useState(null);
  const [paywallReason, setPaywallReason] = useState(null);
  const [lang, setLang]             = useState(() => { try { return localStorage.getItem("prepacivique_lang")||"fr"; } catch { return "fr"; } });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [translations, setTranslations] = useState({});
  const [xlateProgress, setXlateProgress] = useState(0);
  const [xlateError, setXlateError] = useState(null);
  const [speed, setSpeed]           = useState(1);
  const [listenIncludeExpl, setListenIncludeExpl] = useState(true);
  const [listenBilingual, setListenBilingual] = useState(true);
  const [quizQs, setQuizQs]         = useState([]);
  const [qIdx, setQIdx]             = useState(0);
  const [selected, setSelected]     = useState(null);
  const [answered, setAnswered]     = useState(false);
  const [scores, setScores]         = useState({});
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [allWrongAnswers, setAllWrongAnswers] = useState([]);
  const [mockTimeLeft, setMockTimeLeft] = useState(null);
  const [isMockExam, setIsMockExam] = useState(false);
  const [currentQuizTheme, setCurrentQuizTheme] = useState(null);
  const [feedbackMode, setFeedbackMode] = useState("immediate"); // "immediate" | "end"
  const [showFeedbackPicker, setShowFeedbackPicker] = useState(false);
  const [pendingQuizTheme, setPendingQuizTheme] = useState(null);
  const [listenQs, setListenQs]     = useState([]);
  const [listenIdx, setListenIdx]   = useState(0);
  const [listenPlaying, setListenPlaying] = useState(false);
  const [listenPhase, setListenPhase] = useState("");
  const [readingChoiceIdx, setReadingChoiceIdx] = useState(null);
  const [isSpeakingQuiz, setIsSpeakingQuiz] = useState(false);
  const [autoReadQuiz, setAutoReadQuiz] = useState(false);
  const [assignedCode, setAssignedCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  const quizSpeakAbortRef = useRef(false);
  const synthRef = useRef(null);
  const translatingRef = useRef(false);
  const listenRef = useRef({playing:false,idx:0,questions:[]});

  useEffect(() => { synthRef.current = window.speechSynthesis; return () => synthRef.current?.cancel(); }, []);
  useEffect(() => { try { localStorage.setItem("prepacivique_premium", isPremium?"true":"false"); } catch {} }, [isPremium]);
  useEffect(() => { try { localStorage.setItem("prepacivique_trial_v2", JSON.stringify(trialUsed)); } catch {} }, [trialUsed]);
  useEffect(() => { try { localStorage.setItem("prepacivique_lang", lang); } catch {} }, [lang]);
  useEffect(() => { try { localStorage.setItem("prepacivique_stats", JSON.stringify(globalStats)); } catch {} }, [globalStats]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      setScreen("payment-success");
      setCodeLoading(true);
      (async () => {
        try {
          await new Promise(r => setTimeout(r, 5000));
          const sessionId = params.get("session_id");
          const email = params.get("email");
          for (let attempt = 0; attempt < 15; attempt++) {
            let url = sessionId
              ? `${SUPABASE_URL}/rest/v1/activation_codes?stripe_session_id=eq.${encodeURIComponent(sessionId)}&used=eq.true&select=code&order=used_at.desc&limit=1`
              : email
              ? `${SUPABASE_URL}/rest/v1/activation_codes?customer_email=eq.${encodeURIComponent(email)}&used=eq.true&select=code&order=used_at.desc&limit=1`
              : null;
            if (!url) break;
            const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
            if (res.ok) { const data = await res.json(); if (data?.length > 0) { setAssignedCode(data[0].code); break; } }
            await new Promise(r => setTimeout(r, 2000));
          }
        } catch {}
        setCodeLoading(false);
      })();
    }
  }, []);

  const handleCodeSubmit = async () => {
    const trimmed = codeInput.trim();
    if (!trimmed) return;
    setCodeStatus("checking");
    const valid = await validateCode(trimmed);
    if (valid) {
      setIsPremium(true); setCodeStatus("ok"); setPaywallReason(null);
      setTimeout(() => { setCodeInput(""); setCodeStatus(null); setScreen("home"); }, 1200);
    } else {
      setCodeStatus("error");
      setTimeout(() => setCodeStatus(null), 2500);
    }
  };

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const isRTL = !!currentLang.rtl;
  const getT = useCallback((idx) => (lang==="fr"||!translations[lang]||!isPremium) ? null : translations[lang][idx]||null, [lang,translations,isPremium]);
  const requirePremium = (r) => setPaywallReason(r);
  const checkPremium   = (r) => { if (isPremium) return true; requirePremium(r); return false; };
  const isLoading = isPremium && lang !== "fr" && !translations[lang];
  const loadPct = Math.round((xlateProgress / ALL_QUESTIONS.length) * 100);

  useEffect(() => {
    if (!isPremium || lang === "fr" || translations[lang]) return;
    if (translatingRef.current) return;
    translatingRef.current = true;
    setXlateProgress(0); setXlateError(null);
    (async () => {
      const result = [];
      for (let i = 0; i < ALL_QUESTIONS.length; i += BATCH_SIZE) {
        try {
          const tr = await translateBatch(ALL_QUESTIONS.slice(i, i+BATCH_SIZE), lang);
          result.push(...tr);
          setXlateProgress(result.length);
        } catch (err) {
          setXlateError(err instanceof Error ? err.message : "Erreur de traduction.");
          translatingRef.current = false; return;
        }
      }
      setTranslations(prev => ({...prev, [lang]: result}));
      setXlateProgress(ALL_QUESTIONS.length);
      translatingRef.current = false;
    })();
  }, [lang, isPremium]);

  const stopAll = useCallback(() => {
    synthRef.current?.cancel();
    listenRef.current.playing = false;
    setListenPlaying(false); setListenPhase(""); setReadingChoiceIdx(null);
    setIsSpeakingQuiz(false);
  }, []);

  useEffect(() => {
    if (!isMockExam || mockTimeLeft === null) return;
    const interval = setInterval(() => {
      setMockTimeLeft(t => {
        if (t === null || t <= 1) { clearInterval(interval); setScreen("results"); setIsMockExam(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isMockExam]);

  const speakOne = useCallback((text, langCode, onEnd) => {
    if (!synthRef.current) { onEnd?.(); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = LANGUAGES.find(l=>l.code===langCode)?.tts||"fr-FR"; utt.rate = speed;
    utt.onend = onEnd||null; utt.onerror = onEnd||null;
    synthRef.current.speak(utt);
  }, [speed]);

  const runListenFrom = useCallback((idx, questions, bilingual) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const playQ = (i) => {
      if (!listenRef.current.playing || i >= questions.length) { setListenPlaying(false); setListenPhase(""); return; }
      listenRef.current.idx = i; setListenIdx(i);
      const q = questions[i];
      const t = bilingual ? getT(q.origIdx ?? ALL_QUESTIONS.findIndex(x=>x.q===q.q)) : null;
      const segs = [
        { text:`Question ${i+1} sur ${questions.length}.`, lang:"fr", phase:"question" },
        { text:q.q, lang:"fr", phase:"question" },
        ...(t&&lang!=="fr"?[{text:t.q,lang,phase:"question"}]:[]),
        { text:`La bonne réponse est : ${q.c[q.a]}`, lang:"fr", phase:"answer", ci:q.a },
        ...(t&&lang!=="fr"?[{text:t.c[q.a],lang,phase:"answer",ci:q.a}]:[]),
        ...(listenIncludeExpl?[{text:q.e,lang:"fr",phase:"explanation"},...(t&&lang!=="fr"?[{text:t.e,lang,phase:"explanation"}]:[])]:[] ),
      ];
      let si = 0;
      const next = () => {
        if (!listenRef.current.playing) return;
        if (si >= segs.length) { setListenPhase("pause"); setTimeout(() => { if(listenRef.current.playing) playQ(i+1); }, 800); return; }
        const seg = segs[si++]; setListenPhase(seg.phase);
        if (seg.ci !== undefined) setReadingChoiceIdx(seg.ci); else setReadingChoiceIdx(null);
        speakOne(seg.text, seg.lang, next);
      };
      next();
    };
    playQ(idx);
  }, [lang, listenIncludeExpl, getT, speakOne]);

  const startListen = (themeFilter) => {
    if (!checkPremium("listen")) return;
    stopAll();
    const pool = (themeFilter
      ? ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i})).filter(q=>q.theme===themeFilter)
      : ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i}))
    );
    setListenQs(pool); setListenIdx(0);
    listenRef.current = {playing:true,idx:0,questions:pool};
    setListenPlaying(true); setScreen("listen");
    setTimeout(() => runListenFrom(0, pool, listenBilingual), 200);
  };

  const toggleListenPause = () => {
    if (listenPlaying) { synthRef.current?.cancel(); listenRef.current.playing=false; setListenPlaying(false); }
    else { listenRef.current.playing=true; setListenPlaying(true); runListenFrom(listenIdx, listenRef.current.questions, listenBilingual); }
  };

  const skipTo = (i) => {
    synthRef.current?.cancel(); setListenIdx(i); listenRef.current.idx = i;
    if (listenPlaying) setTimeout(() => runListenFrom(i, listenRef.current.questions, listenBilingual), 150);
  };

  // Show feedback mode picker before starting quiz
  const promptQuizStart = (themeId) => {
    setPendingQuizTheme(themeId);
    setShowFeedbackPicker(true);
  };

  const startQuiz = (themeId=null) => {
    stopAll();
    setShowFeedbackPicker(false);
    let pool = (themeId
      ? ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i})).filter(q=>q.theme===themeId)
      : ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i}))
    ).slice();
    for (let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    // Shuffle choices within each question
    pool = pool.map(q => {
      const indices = [0,1,2,3];
      for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
      const newC = indices.map(i => q.c[i]);
      const newA = indices.indexOf(q.a);
      return {...q, c: newC, a: newA};
    });
    if (!isPremium) {
      if (themeId) { pool = pool.slice(0, TRIAL_PER_THEME); }
      else {
        const byTheme = {};
        pool = pool.filter(q => { byTheme[q.theme]=(byTheme[q.theme]||0); if(byTheme[q.theme]<TRIAL_PER_THEME){byTheme[q.theme]++;return true;}return false; });
      }
    }
    setCurrentQuizTheme(themeId);
    setQuizQs(pool); setQIdx(0); setSelected(null); setAnswered(false); setScores({}); setWrongAnswers([]);
    setIsMockExam(false); setMockTimeLeft(null); setAutoReadQuiz(false);
    setScreen("quiz");
  };

  const startMockExam = () => {
    if (!checkPremium("quiz")) return;
    let pool = [...ALL_QUESTIONS].map((q,i)=>({...q,origIdx:i})).sort(()=>Math.random()-.5).slice(0,40);
    pool = pool.map(q => {
      const indices = [0,1,2,3];
      for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
      const newC = indices.map(i => q.c[i]);
      const newA = indices.indexOf(q.a);
      return {...q, c: newC, a: newA};
    });
    setQuizQs(pool); setQIdx(0); setSelected(null); setAnswered(false); setScores({}); setWrongAnswers([]);
    setCurrentQuizTheme(null); setIsMockExam(true); setMockTimeLeft(45*60); setScreen("quiz");
  };

  const handleAnswer = (idx) => {
    if (answered) return;
    quizSpeakAbortRef.current = true;
    setSelected(idx); setAnswered(true);
    const correct = idx === quizQs[qIdx].a;
    setScores(p => ({...p,[qIdx]:correct}));
    if (!correct) setWrongAnswers(p => [...p, quizQs[qIdx]]);
    if (!isPremium) { const theme=quizQs[qIdx].theme; setTrialUsed(u=>({...u,[theme]:Math.max(u[theme]||0,qIdx+1)})); }
    // Update global stats
    if (activeLevel) {
      setGlobalStats(prev => {
        const lv = prev[activeLevel] || {answered:0,correct:0,exams:0,scores:[],byTheme:{}};
        const byTheme = {...(lv.byTheme||{})};
        byTheme[quizQs[qIdx].theme] = (byTheme[quizQs[qIdx].theme]||0) + 1;
        return {...prev,[activeLevel]:{...lv,answered:lv.answered+1,correct:lv.correct+(correct?1:0),byTheme}};
      });
    }
    stopAll();
  };

  const nextQ = () => {
    quizSpeakAbortRef.current = true; stopAll();
    if (qIdx+1 >= quizQs.length) {
      setAllWrongAnswers(prev => { const prevQs=prev.map(q=>q.q); return [...prev,...wrongAnswers.filter(q=>!prevQs.includes(q.q))]; });
      // If mock exam, record score
      if (isMockExam && activeLevel) {
        const sc = Math.round((Object.values(scores).filter(Boolean).length / quizQs.length) * 100);
        setGlobalStats(prev => { const lv=prev[activeLevel]||{answered:0,correct:0,exams:0,scores:[],byTheme:{}}; return {...prev,[activeLevel]:{...lv,exams:lv.exams+1,scores:[...(lv.scores||[]),sc]}}; });
      }
      setScreen("results"); return;
    }
    setQIdx(c => c+1); setSelected(null); setAnswered(false);
  };

  const readCurrentQuiz = () => {
    if (isSpeakingQuiz) { quizSpeakAbortRef.current=true; synthRef.current?.cancel(); setIsSpeakingQuiz(false); setReadingChoiceIdx(null); return; }
    quizSpeakAbortRef.current = false; synthRef.current?.cancel();
    const q = quizQs[qIdx];
    const segs = [{text:q.q,lang:"fr"},...q.c.map((ch,i)=>({text:`${String.fromCharCode(65+i)}. ${ch}`,lang:"fr",ci:i}))];
    setIsSpeakingQuiz(true); let si=0;
    const next = () => {
      if (quizSpeakAbortRef.current||si>=segs.length){setReadingChoiceIdx(null);setIsSpeakingQuiz(false);return;}
      const seg=segs[si++]; if(seg.ci!==undefined)setReadingChoiceIdx(seg.ci);else setReadingChoiceIdx(null);
      const utt=new SpeechSynthesisUtterance(seg.text); utt.lang="fr-FR"; utt.rate=speed;
      utt.onend=next; utt.onerror=next; synthRef.current?.speak(utt);
    };
    setTimeout(next, 50);
  };

  const totalScore   = Object.values(scores).filter(Boolean).length;
  const totalAnswered = Object.values(scores).length;
  const passMark     = Math.ceil(quizQs.length * 0.8);
  const passed       = totalScore >= passMark;
  const listenCurQ   = listenQs[listenIdx];
  const phaseLabel   = {question:"🗣️ Question",answer:"✅ Réponse",explanation:"💡 Explication",pause:"⏸ Pause"};

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#F5F6F8",fontFamily:""DM Sans","Outfit",system-ui,sans-serif",direction:isRTL?"rtl":"ltr"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes wv0{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
        @keyframes wv1{0%,100%{transform:scaleY(.8)}50%{transform:scaleY(.3)}}
        @keyframes wv2{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}
        @keyframes wv3{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.4)}}
        @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.9}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,.3)}70%{box-shadow:0 0 0 10px rgba(37,99,235,0)}}
        .fade{animation:fadeUp .35s ease forwards}
        .choice-btn{transition:all .15s ease;border:1.5px solid #E5E7EB;background:white;width:100%;cursor:pointer;border-radius:8px;font-family:inherit}
        .choice-btn:not(:disabled):hover{border-color:#1A3A5C;background:#F0F4F8}
        .choice-correct{border-color:#2E7D52!important;background:#EDF7F2!important}
        .choice-wrong{border-color:#C0392B!important;background:#FDF0EF!important}
        .shimmer{animation:shimmer 1.2s ease infinite}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:4px}
        @media(max-width:640px){.sidebar{display:none!important}.mobile-header{display:flex!important}}
        .mobile-header{display:none}
      `}</style>

      {/* Paywall */}
      {paywallReason && <PaywallModal reason={paywallReason} onClose={() => setPaywallReason(null)} codeInput={codeInput} setCodeInput={setCodeInput} codeStatus={codeStatus} handleCodeSubmit={handleCodeSubmit}/>}

      {/* Feedback mode picker modal */}
      {showFeedbackPicker && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:12,padding:"32px 28px",maxWidth:460,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.15)"}}>
            <h2 style={{margin:"0 0 6px",fontSize:17,fontWeight:700,color:"#0F1923"}}>
              {THEMES.find(t=>t.id===pendingQuizTheme)?.label||"Quiz"} — {ALL_QUESTIONS.filter(q=>q.theme===pendingQuizTheme).length} questions
            </h2>
            <p style={{margin:"0 0 20px",color:"#6B7280",fontSize:13}}>Test en {pendingQuizTheme ? ALL_QUESTIONS.filter(q=>q.theme===pendingQuizTheme).length : quizQs.length} questions</p>
            <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:"#0F1923"}}>Mode de feedback</div>
            {[
              {id:"immediate",label:"Immédiat",desc:"Voir la bonne réponse et l'explication après chaque question."},
              {id:"end",label:"À la fin",desc:"Voir toutes les réponses uniquement à la fin du test"},
            ].map(opt => (
              <label key={opt.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",borderRadius:8,border:`1.5px solid ${feedbackMode===opt.id?"#1A3A5C":"#E5E7EB"}`,background:feedbackMode===opt.id?"#F0F4F8":"white",cursor:"pointer",marginBottom:10}}>
                <input type="radio" checked={feedbackMode===opt.id} onChange={() => setFeedbackMode(opt.id)} style={{marginTop:2,accentColor:"#1A3A5C"}}/>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:"#0F1923"}}>{opt.label}</div>
                  <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{opt.desc}</div>
                </div>
              </label>
            ))}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={() => setShowFeedbackPicker(false)} style={{flex:1,padding:"12px",borderRadius:8,border:"1.5px solid #E5E7EB",background:"white",cursor:"pointer",fontWeight:600,fontSize:14,color:"#374151"}}>Annuler</button>
              <button onClick={() => startQuiz(pendingQuizTheme)} style={{flex:2,padding:"12px",borderRadius:8,border:"none",background:"#0F1923",color:"white",cursor:"pointer",fontWeight:700,fontSize:14}}>Commencer le test</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        <Sidebar activeLevel={activeLevel} setActiveLevel={setActiveLevel} screen={screen} setScreen={setScreen} isPremium={isPremium} stats={globalStats} stopAll={stopAll}/>
      </div>

      {/* Main content */}
      <div style={{flex:1,overflowY:"auto"}}>
        {/* Top bar */}
        <div style={{background:"white",borderBottom:"1px solid #EAECEF",padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {(screen!=="home"||activeLevel) && (
              <button onClick={() => { stopAll(); if(screen==="quiz"||screen==="results"||screen==="listen"){setScreen(activeLevel?"level":"home");}else{setActiveLevel(null);setScreen("home");} }}
                style={{background:"none",border:"none",cursor:"pointer",color:"#6B7280",fontSize:13,display:"flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:6,fontWeight:500}}>
                ← {activeLevel ? `Retour à ${LEVELS.find(l=>l.id===activeLevel)?.label}` : "Retour"}
              </button>
            )}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {isLoading && <div style={{fontSize:11,color:"#6B7280",display:"flex",alignItems:"center",gap:6}}><span className="shimmer" style={{width:8,height:8,borderRadius:"50%",background:"#1A3A5C",display:"inline-block"}}/>Traduction {loadPct}%</div>}
            {/* Settings */}
            <div style={{position:"relative"}}>
              <button onClick={() => {setShowSettings(v=>!v);setShowLangMenu(false);}} style={{background:"none",border:"1px solid #E5E7EB",borderRadius:6,padding:"5px 10px",cursor:"pointer",color:"#374151",fontSize:13}}>⚙️</button>
              {showSettings && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"white",borderRadius:8,boxShadow:"0 8px 32px rgba(0,0,0,.12)",padding:"16px",minWidth:220,zIndex:120,border:"1px solid #E5E7EB"}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"#0F1923"}}>Paramètres audio</div>
                  <div style={{fontSize:11,color:"#6B7280",marginBottom:6}}>Vitesse de lecture</div>
                  <div style={{display:"flex",gap:4,marginBottom:12}}>
                    {SPEEDS.map(s=><button key={s.v} onClick={()=>setSpeed(s.v)} style={{flex:1,padding:"5px 0",borderRadius:6,border:speed===s.v?"1.5px solid #1A3A5C":"1.5px solid #E5E7EB",background:speed===s.v?"#F0F4F8":"white",color:speed===s.v?"#1A3A5C":"#374151",fontSize:11,fontWeight:600,cursor:"pointer"}}>{s.label}</button>)}
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:8,fontSize:12,color:"#374151"}}>
                    <input type="checkbox" checked={listenIncludeExpl} onChange={e=>setListenIncludeExpl(e.target.checked)}/>Inclure les explications
                  </label>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:"#374151"}}>
                    <input type="checkbox" checked={listenBilingual} onChange={e=>setListenBilingual(e.target.checked)}/>Lecture bilingue
                  </label>
                </div>
              )}
            </div>
            {/* Language */}
            <div style={{position:"relative"}}>
              <button onClick={() => { if(!isPremium&&lang==="fr"){requirePremium("lang");return;} setShowLangMenu(v=>!v);setShowSettings(false); }}
                style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"1px solid #E5E7EB",borderRadius:6,padding:"5px 10px",cursor:"pointer",color:"#374151",fontSize:12}}>
                <span>{currentLang.flag}</span><span style={{fontWeight:600}}>{lang==="fr"?"FR":lang.toUpperCase()}</span>
                {!isPremium&&<span style={{fontSize:10}}>🔒</span>}
              </button>
              {showLangMenu && isPremium && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"white",borderRadius:8,boxShadow:"0 8px 32px rgba(0,0,0,.12)",overflow:"hidden",minWidth:180,zIndex:120,maxHeight:320,overflowY:"auto",border:"1px solid #E5E7EB"}}>
                  {LANGUAGES.map(l=>(
                    <button key={l.code} onClick={()=>{setLang(l.code);setShowLangMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"none",borderBottom:"1px solid #F3F4F6",background:lang===l.code?"#F0F4F8":"white",cursor:"pointer",width:"100%",textAlign:"left"}}>
                      <span style={{fontSize:15}}>{l.flag}</span>
                      <span style={{fontSize:12,fontWeight:lang===l.code?700:400,color:"#0F1923"}}>{l.native}</span>
                      {lang===l.code&&<span style={{marginLeft:"auto",color:"#1A3A5C",fontSize:12}}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Premium badge or unlock */}
            {isPremium
              ? <div style={{background:"#FEF9C3",color:"#854D0E",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700}}>⭐ Premium</div>
              : <button onClick={()=>setScreen("pricing")} style={{background:"#0F1923",color:"white",border:"none",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>🔓 Débloquer</button>
            }
          </div>
        </div>

        {/* Page content */}
        <div style={{padding:"28px 28px",maxWidth:900,margin:"0 auto"}} onClick={() => { showLangMenu&&setShowLangMenu(false); showSettings&&setShowSettings(false); }}>

          {/* HOME */}
          {screen==="home" && !activeLevel && (
            <div className="fade">
              <HomeDashboard stats={globalStats} onSelectLevel={(id) => { setActiveLevel(id); setScreen("level"); }} setScreen={setScreen}/>
            </div>
          )}

          {/* LEVEL */}
          {screen==="level" && activeLevel && (
            <div className="fade">
              <LevelDashboard
                level={activeLevel}
                stats={globalStats}
                onStartQuiz={(themeId) => promptQuizStart(themeId)}
                onStartMockExam={startMockExam}
                onStartListen={startListen}
                isPremium={isPremium}
                checkPremium={checkPremium}
              />
            </div>
          )}

          {/* PAYMENT SUCCESS */}
          {screen==="payment-success" && (
            <div className="fade" style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:56,marginBottom:16}}>{codeLoading?"⏳":"🎉"}</div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#0F1923",marginBottom:8}}>{codeLoading?"Récupération de votre code…":"Paiement confirmé !"}</h2>
              {codeLoading
                ? <p style={{color:"#6B7280"}}>Veuillez patienter…</p>
                : <>
                    {assignedCode && (
                      <div style={{background:"#F5F6F8",border:"2px solid #1A3A5C",borderRadius:10,padding:"20px",marginBottom:20,display:"inline-block"}}>
                        <div style={{fontSize:11,color:"#6B7280",marginBottom:6}}>Votre code d'activation :</div>
                        <div style={{fontFamily:"monospace",fontSize:20,fontWeight:700,color:"#0F1923",letterSpacing:2,marginBottom:12}}>{assignedCode}</div>
                        <button onClick={() => { navigator.clipboard.writeText(assignedCode); alert("Copié !"); }} style={{background:"white",border:"1px solid #1A3A5C",borderRadius:6,padding:"6px 16px",cursor:"pointer",fontSize:12,color:"#1A3A5C",fontWeight:600}}>📋 Copier</button>
                      </div>
                    )}
                    <div style={{marginTop:12}}>
                      <button onClick={() => { setCodeInput(assignedCode); setScreen("pricing"); }} style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"12px 28px",cursor:"pointer",fontSize:14,fontWeight:700}}>
                        Activer mon accès →
                      </button>
                    </div>
                  </>
              }
            </div>
          )}

          {/* PRICING */}
          {screen==="pricing" && (
            <div className="fade">
              <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:700,color:"#0F1923"}}>Accès complet</h2>
              <p style={{margin:"0 0 24px",color:"#6B7280"}}>{ALL_QUESTIONS.length} questions officielles · Mode écoute · 11 langues</p>
              <div style={{background:"white",borderRadius:12,border:"2px solid #1A3A5C",padding:"28px",maxWidth:420,marginBottom:20}}>
                <div style={{fontWeight:800,fontSize:28,color:"#0F1923",marginBottom:4}}>5,00 €</div>
                <div style={{color:"#6B7280",fontSize:13,marginBottom:20}}>Paiement unique · Accès à vie</div>
                {["✓ "+ALL_QUESTIONS.length+" questions officielles","✓ Mode écoute Play All","✓ 11 langues + traduction IA","✓ Résultats et analyses détaillés","✓ Vitesse audio réglable","✓ Accès à vie"].map(f=>(
                  <div key={f} style={{fontSize:13,color:"#374151",marginBottom:8,fontWeight:500}}>{f}</div>
                ))}
                <a href={STRIPE_LINK} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:20,background:"#0F1923",color:"white",borderRadius:8,padding:"13px",fontWeight:700,fontSize:14,textDecoration:"none",textAlign:"center"}}>
                  💳 Acheter maintenant
                </a>
              </div>
              {!isPremium && (
                <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"24px",maxWidth:420}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:"#0F1923"}}>🔑 Vous avez déjà un code ?</div>
                  <div style={{display:"flex",gap:8}}>
                    <input value={codeInput} onChange={e=>setCodeInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCodeSubmit()} placeholder="CIVIC-XXXX-XXXX-XXXX"
                      style={{flex:1,padding:"10px 12px",borderRadius:8,border:`1.5px solid ${codeStatus==="error"?"#C0392B":codeStatus==="ok"?"#2E7D52":"#D1D5DB"}`,fontSize:12,fontFamily:"monospace",outline:"none"}}/>
                    <button onClick={handleCodeSubmit} disabled={codeStatus==="checking"||codeStatus==="ok"}
                      style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer",fontWeight:700,fontSize:13}}>
                      {codeStatus==="checking"?"…":"Activer"}
                    </button>
                  </div>
                  {codeStatus&&<div style={{marginTop:8,fontSize:12,color:codeStatus==="ok"?"#2E7D52":"#C0392B",fontWeight:600}}>
                    {codeStatus==="ok"?"✅ Accès débloqué !":codeStatus==="error"?"❌ Code invalide.":"⏳ Vérification…"}
                  </div>}
                </div>
              )}
            </div>
          )}

          {/* LISTEN MODE */}
          {screen==="listen" && listenCurQ && (
            <div className="fade">
              <div style={{background:"linear-gradient(160deg,#1C1917,#2D1832,#6B21A8)",color:"white",borderRadius:12,padding:"24px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <div style={{padding:"4px 12px",borderRadius:6,background:"rgba(255,255,255,.15)",fontSize:12,fontWeight:600}}>
                    {listenPlaying?(phaseLabel[listenPhase]||"⏳"):"⏸ En pause"}
                  </div>
                  {listenPlaying && <Waveform active={true} color="rgba(255,255,255,.9)" size={16}/>}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,opacity:.8,marginBottom:6}}>
                  <span>Question {listenIdx+1} / {listenQs.length}</span>
                  <span>{Math.round(((listenIdx+1)/listenQs.length)*100)}%</span>
                </div>
                <div style={{background:"rgba(255,255,255,.2)",borderRadius:4,height:5,marginBottom:18}}>
                  <div style={{width:`${((listenIdx+1)/listenQs.length)*100}%`,height:"100%",background:"white",borderRadius:4,transition:"width .5s"}}/>
                </div>
                <div style={{fontSize:15,fontWeight:600,lineHeight:1.65,marginBottom:8}}>{listenCurQ.q}</div>
                {(listenPhase==="answer"||listenPhase==="explanation"||listenPhase==="pause") && (
                  <div style={{background:"rgba(255,255,255,.15)",borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                    <div style={{fontSize:11,opacity:.7,marginBottom:3}}>✅ Bonne réponse</div>
                    <div style={{fontWeight:700,fontSize:14}}>{listenCurQ.c[listenCurQ.a]}</div>
                  </div>
                )}
                {(listenPhase==="explanation"||listenPhase==="pause") && (
                  <div style={{background:"rgba(255,255,255,.1)",borderRadius:8,padding:"10px 14px",fontSize:12,lineHeight:1.75}}>💡 {listenCurQ.e}</div>
                )}
                <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:14,marginTop:20}}>
                  <button onClick={()=>skipTo(Math.max(0,listenIdx-1))} style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",borderRadius:8,width:40,height:40,cursor:"pointer",fontSize:16}}>⏮</button>
                  <button onClick={toggleListenPause} style={{background:"white",border:"none",color:"#6B21A8",borderRadius:8,width:56,height:56,cursor:"pointer",fontSize:22,fontWeight:700,boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>
                    {listenPlaying?"⏸":"▶"}
                  </button>
                  <button onClick={()=>skipTo(Math.min(listenQs.length-1,listenIdx+1))} style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",borderRadius:8,width:40,height:40,cursor:"pointer",fontSize:16}}>⏭</button>
                </div>
                <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:12}}>
                  {SPEEDS.map(s=><button key={s.v} onClick={()=>setSpeed(s.v)} style={{padding:"4px 10px",borderRadius:4,border:"none",background:speed===s.v?"white":"rgba(255,255,255,.15)",color:speed===s.v?"#6B21A8":"white",fontSize:11,fontWeight:600,cursor:"pointer"}}>{s.label}</button>)}
                </div>
              </div>
              {/* Playlist */}
              <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"16px"}}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"#0F1923"}}>Playlist — {listenQs.length} questions</div>
                <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                  {listenQs.map((q,i)=>{
                    const th=THEMES.find(t=>t.id===q.theme);
                    const isCur=i===listenIdx,isPast=i<listenIdx;
                    return (
                      <div key={i} onClick={()=>skipTo(i)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:6,background:isCur?"#F0F4F8":isPast?"#F9FAFB":"white",border:`1px solid ${isCur?"#1A3A5C":"#F3F4F6"}`,cursor:"pointer"}}>
                        <div style={{width:22,height:22,borderRadius:4,background:isCur?"#1A3A5C":isPast?"#D1D5DB":"#F3F4F6",color:isCur||isPast?"white":"#9CA3AF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>
                          {isCur&&listenPlaying?<Waveform active={true} color="white" size={9}/>:i+1}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:isCur?600:400,color:isCur?"#1A3A5C":isPast?"#9CA3AF":"#374151",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{q.q}</div>
                          <div style={{fontSize:10,color:th?.color,marginTop:1}}>{th?.icon} {th?.label}</div>
                        </div>
                        {isPast&&<span style={{color:"#2E7D52",fontSize:12}}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* QUIZ */}
          {screen==="quiz" && quizQs.length>0 && (()=>{
            const q=quizQs[qIdx];
            const t=getT(q.origIdx??ALL_QUESTIONS.findIndex(x=>x.q===q.q));
            const th=THEMES.find(x=>x.id===q.theme);
            return (
              <div className="fade">
                {/* Quiz header */}
                <div style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"14px 18px",marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:12,color:th?.color,fontWeight:600}}>{th?.icon} {th?.label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <button onClick={() => { const n=!autoReadQuiz; setAutoReadQuiz(n); if(!n){quizSpeakAbortRef.current=true;synthRef.current?.cancel();setIsSpeakingQuiz(false);setReadingChoiceIdx(null);} }}
                        style={{display:"flex",alignItems:"center",gap:5,background:autoReadQuiz?"#1A3A5C":"#F3F4F6",border:"none",color:autoReadQuiz?"white":"#6B7280",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                        🎙 {autoReadQuiz?"Voix ON":"Voix OFF"}
                      </button>
                      <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{qIdx+1}/{quizQs.length}</span>
                      <span style={{fontSize:13,color:"#2E7D52",fontWeight:600}}>✓{totalScore}</span>
                      <span style={{fontSize:13,color:"#C0392B",fontWeight:600}}>✗{totalAnswered-totalScore}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{background:"#F3F4F6",borderRadius:4,height:5}}>
                    <div style={{width:`${(qIdx/quizQs.length)*100}%`,height:"100%",background:th?.color||"#1A3A5C",borderRadius:4,transition:"width .5s ease"}}/>
                  </div>
                  {/* Timer */}
                  {isMockExam && mockTimeLeft!==null && (()=>{
                    const m=Math.floor(mockTimeLeft/60), s=mockTimeLeft%60, urgent=mockTimeLeft<300;
                    return (
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:10,padding:"8px 14px",borderRadius:8,background:urgent?"#FDF0EF":"#F9FAFB",border:`1px solid ${urgent?"#FCA5A5":"#E5E7EB"}`}}>
                        <span style={{fontSize:14}}>{urgent?"⚠️":"⏱️"}</span>
                        <span style={{fontWeight:700,fontSize:15,color:urgent?"#C0392B":"#374151",fontFamily:"monospace",letterSpacing:2}}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</span>
                        <span style={{fontSize:11,color:urgent?"#C0392B":"#6B7280"}}>{urgent?"Dépêchez-vous !":"restant"}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Question card */}
                <div key={qIdx} className="fade" style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"24px",marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:t?6:20}}>
                    <div style={{fontSize:17,fontWeight:600,lineHeight:1.6,flex:1,color:"#0F1923"}}>{q.q}</div>
                    <button onClick={readCurrentQuiz} style={{background:isSpeakingQuiz?"#1A3A5C":"#F3F4F6",border:"none",color:isSpeakingQuiz?"white":"#6B7280",borderRadius:8,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                      {isSpeakingQuiz
                        ? <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="4" height="10" rx="1"/><rect x="8" y="2" width="4" height="10" rx="1"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-6 9a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0H4zm6 7v-2h-1v2H7v1h6v-1h-2z"/></svg>
                      }
                    </button>
                  </div>
                  {t && <div style={{fontSize:13,color:"#6B7280",fontStyle:"italic",marginBottom:18,lineHeight:1.6,borderLeft:"3px solid #D1D5DB",paddingLeft:10,direction:isRTL?"rtl":"ltr"}}>{t.q}</div>}

                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {q.c.map((ch,idx)=>{
                      let extraCls = "choice-btn";
                      const showResult = feedbackMode==="immediate" ? answered : false;
                      if(showResult){if(idx===q.a)extraCls+=" choice-correct";else if(idx===selected)extraCls+=" choice-wrong";}
                      const letterBg = showResult&&idx===q.a?"#2E7D52":showResult&&idx===selected&&idx!==q.a?"#C0392B":readingChoiceIdx===idx?"#1A3A5C":"#F3F4F6";
                      const letterTx = (showResult&&(idx===q.a||(idx===selected&&idx!==q.a)))||readingChoiceIdx===idx?"white":"#6B7280";
                      const letter = showResult&&idx===q.a?"✓":showResult&&idx===selected&&idx!==q.a?"✗":readingChoiceIdx===idx?<Waveform active={true} color="white" size={10}/>:String.fromCharCode(65+idx);
                      return (
                        <button key={idx} className={extraCls} onClick={()=>handleAnswer(idx)} disabled={answered}
                          style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 16px",textAlign:"left",fontSize:14,lineHeight:1.5,fontFamily:"inherit"}}>
                          <span style={{width:26,height:26,borderRadius:6,background:letterBg,color:letterTx,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0,marginTop:1,transition:"all .15s"}}>{letter}</span>
                          <div>
                            <div style={{color:showResult&&idx===q.a?"#2E7D52":"#0F1923",fontWeight:showResult&&idx===q.a?600:400}}>{ch}</div>
                            {t?.c?.[idx]&&lang!=="fr"&&<div style={{fontSize:11.5,color:"#9CA3AF",fontStyle:"italic",marginTop:2,direction:isRTL?"rtl":"ltr"}}>{t.c[idx]}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation (immediate mode only) */}
                  {answered && feedbackMode==="immediate" && (
                    <div className="fade" style={{marginTop:16,padding:"14px 16px",background:selected===q.a?"#EDF7F2":"#FEF9C3",borderRadius:8,borderLeft:`3px solid ${selected===q.a?"#2E7D52":"#D97706"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div style={{fontWeight:600,color:selected===q.a?"#2E7D52":"#D97706",fontSize:13}}>
                          {selected===q.a?"✓ Bonne réponse !":"✗ Réponse incorrecte"}
                        </div>
                        <button onClick={()=>{
                          if(isSpeakingQuiz){quizSpeakAbortRef.current=true;synthRef.current?.cancel();setIsSpeakingQuiz(false);return;}
                          quizSpeakAbortRef.current=false;synthRef.current?.cancel();setIsSpeakingQuiz(true);
                          const txt=`La bonne réponse est : ${q.c[q.a]}. ${q.e}`;
                          const utt=new SpeechSynthesisUtterance(txt); utt.lang="fr-FR"; utt.rate=speed;
                          utt.onend=()=>setIsSpeakingQuiz(false); utt.onerror=()=>setIsSpeakingQuiz(false);
                          setTimeout(()=>synthRef.current?.speak(utt),50);
                        }} style={{background:"none",border:"none",cursor:"pointer",color:"#6B7280",padding:4,display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:500}}>
                          {isSpeakingQuiz?"⏹ Stop":"🔊 Écouter"}
                        </button>
                      </div>
                      <div style={{fontSize:13,color:"#374151",lineHeight:1.7}}>{q.e}</div>
                      {t?.e&&lang!=="fr"&&<div style={{marginTop:8,fontSize:12.5,color:"#6B7280",fontStyle:"italic",lineHeight:1.7,direction:isRTL?"rtl":"ltr",borderTop:"1px solid rgba(0,0,0,.06)",paddingTop:8}}>{t.e}</div>}
                    </div>
                  )}
                </div>

                {answered && (
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button onClick={nextQ} style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"12px 28px",cursor:"pointer",fontSize:14,fontWeight:700}}>
                      {qIdx+1>=quizQs.length?"Voir les résultats →":"Suivant →"}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* FRENCH PRACTICE */}
          {screen==="french" && (
            <FrenchPractice isPremium={isPremium} onBack={()=>{stopAll();setScreen("home");}}/>
          )}

          {/* RESULTS */}
          {screen==="results" && (
            <div className="fade">
              {/* Score banner */}
              <div style={{background:passed?"linear-gradient(145deg,#1B4332,#2D6A4F)":"linear-gradient(145deg,#7F1D1D,#C0392B)",color:"white",textAlign:"center",padding:"40px 24px",borderRadius:12,marginBottom:20}}>
                <div style={{fontSize:48,marginBottom:8}}>{passed?"🎉":"📚"}</div>
                <div style={{fontSize:60,fontWeight:700,lineHeight:1,letterSpacing:-2}}>{totalScore}<span style={{fontSize:24,opacity:.6}}> / {quizQs.length}</span></div>
                <div style={{fontSize:28,fontWeight:700,marginTop:8}}>{Math.round((totalScore/quizQs.length)*100)}%</div>
                <div style={{marginTop:14,fontSize:13,fontWeight:600,background:"rgba(255,255,255,.15)",display:"inline-flex",padding:"7px 18px",borderRadius:6}}>
                  {passed?`✓ Score minimum atteint (${passMark}/${quizQs.length})`:`Il manque ${passMark-totalScore} point(s) pour 80 %`}
                </div>
              </div>

              {/* Detailed review (end mode or wrong answers) */}
              {(feedbackMode==="end" || wrongAnswers.length>0) && (
                <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"24px",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#0F1923",marginBottom:16}}>Révision complète des réponses</div>
                  {(feedbackMode==="end" ? quizQs.map((_,i)=>({q:quizQs[i],correct:scores[i]})) : wrongAnswers.map(q=>({q,correct:false}))).map((item,i)=>{
                    const wq = feedbackMode==="end" ? item.q : item.q;
                    const correct = feedbackMode==="end" ? item.correct : false;
                    return (
                      <div key={i} style={{marginBottom:16,paddingBottom:16,borderBottom:"1px solid #F3F4F6"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div style={{fontSize:12,color:"#6B7280"}}>Question {i+1}</div>
                          <span style={{background:correct?"#DCFCE7":"#FEE2E2",color:correct?"#166534":"#991B1B",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>
                            {correct?"✓ Correcte":"✗ Incorrecte"}
                          </span>
                        </div>
                        <div style={{fontWeight:600,fontSize:13,color:"#0F1923",marginBottom:8}}>{wq.q}</div>
                        {!correct && feedbackMode==="end" && (
                          <div style={{fontSize:12,color:"#C0392B",marginBottom:4}}>Votre réponse : {wq.c?.[selected]||"—"}</div>
                        )}
                        <div style={{fontSize:12,color:"#2E7D52",fontWeight:600,marginBottom:8}}>Bonne réponse : {wq.c?.[wq.a]}</div>
                        <div style={{fontSize:12,color:"#6B7280",lineHeight:1.7,background:"#F5F6F8",borderRadius:6,padding:"10px 12px"}}>
                          <strong>Explication : </strong>{wq.e}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Premium upsell */}
              {!isPremium && (
                <div style={{background:"#0F1923",color:"white",borderRadius:12,padding:"24px",textAlign:"center",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>🚀 Débloquez les {ALL_QUESTIONS.length} questions</div>
                  <div style={{fontSize:13,opacity:.8,marginBottom:16}}>Mode écoute, 11 langues, analyses détaillées — 5,00 € une seule fois.</div>
                  <a href={STRIPE_LINK} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",background:"#1A3A5C",color:"white",borderRadius:8,padding:"11px 24px",fontWeight:700,fontSize:14,textDecoration:"none"}}>
                    Accès complet →
                  </a>
                </div>
              )}

              <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={() => startQuiz(currentQuizTheme)} style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700}}>🔄 Recommencer</button>
                {isPremium&&<button onClick={()=>startListen("all")} style={{background:"white",color:"#0F1923",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:600}}>🎧 Mode écoute</button>}
                <button onClick={()=>{stopAll();setScreen(activeLevel?"level":"home");}} style={{background:"white",color:"#0F1923",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:600}}>🏠 Accueil</button>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {screen==="profile" && (
            <div className="fade">
              <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:700,color:"#0F1923"}}>Profil</h2>
              <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"24px",marginBottom:16}}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:16,color:"#0F1923"}}>Statut</div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👤</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:14,color:"#0F1923"}}>{isPremium?"Compte Premium":"Compte Gratuit"}</div>
                    <div style={{fontSize:12,color:"#6B7280"}}>{isPremium?"Accès complet à toutes les questions":"10 questions par thème"}</div>
                  </div>
                  {isPremium && <div style={{marginLeft:"auto",background:"#FEF9C3",color:"#854D0E",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700}}>⭐ Premium</div>}
                </div>
              </div>
              {!isPremium && (
                <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"24px",marginBottom:16}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:"#0F1923"}}>🔑 Code d'activation</div>
                  <div style={{display:"flex",gap:8}}>
                    <input value={codeInput} onChange={e=>setCodeInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCodeSubmit()} placeholder="CIVIC-XXXX-XXXX-XXXX"
                      style={{flex:1,padding:"10px 12px",borderRadius:8,border:`1.5px solid ${codeStatus==="error"?"#C0392B":codeStatus==="ok"?"#2E7D52":"#D1D5DB"}`,fontSize:12,fontFamily:"monospace",outline:"none"}}/>
                    <button onClick={handleCodeSubmit} disabled={codeStatus==="checking"||codeStatus==="ok"}
                      style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer",fontWeight:700,fontSize:13}}>
                      {codeStatus==="checking"?"…":"Activer"}
                    </button>
                  </div>
                  {codeStatus&&<div style={{marginTop:8,fontSize:12,color:codeStatus==="ok"?"#2E7D52":"#C0392B",fontWeight:600}}>
                    {codeStatus==="ok"?"✅ Accès débloqué !":codeStatus==="error"?"❌ Code invalide.":"⏳ Vérification…"}
                  </div>}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
