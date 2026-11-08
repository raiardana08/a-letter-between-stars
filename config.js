/* ==========================================================================
   A LETTER BETWEEN THE STARS — config.js
   --------------------------------------------------------------------------
   Ini SATU-SATUNYA file yang perlu Anda edit untuk mempersonalisasi website.
   Semua teks, nama, pesan kartu, bintang, dan surat ada di sini.

   CARA PAKAI TOKEN
   Di teks mana pun Anda boleh menulis token berikut, otomatis diganti:
     {recipient}  -> recipientName
     {sender}     -> senderName
     {date}       -> specialDate
     {message}    -> personalMessage
     {memory}     -> memory

   LANGKAH CEPAT
   1) Ganti 5 placeholder di bagian "IDENTITAS & ISI PERSONAL" di bawah.
   2) Sesuaikan pesan kartu, surat, dan bintang bila perlu.
   3) Simpan, lalu refresh browser.

   Catatan: nama pengirim (senderName) HANYA muncul di chapter terakhir.
   ========================================================================== */

window.LETTER_CONFIG = {

  /* ======================= IDENTITAS & ISI PERSONAL ======================= */
  siteTitle: "A Letter Between the Stars",

  recipientName:   "[NAMA_PENERIMA]",   // nama orang yang dituju
  senderName:      "[NAMA_PENGIRIM]",   // nama Anda (diungkap di chapter 5)
  personalMessage: "[PESAN_PERSONAL]",  // satu paragraf pribadi di dalam surat
  memory:          "[KENANGAN]",        // satu kenangan singkat (dipakai di kartu & bintang)
  specialDate:     "[TANGGAL_SPESIAL]", // mis. "7 November 2026"

  // Tampilkan "for <nama penerima>" kecil di halaman pembuka?
  showRecipientOnIntro: true,

  /* ================================= MUSIK ================================= */
  music: {
    // Kosongkan untuk memakai musik ambient bawaan (dibuat langsung oleh browser,
    // tanpa file). Atau isi dengan file Anda, mis. "assets/music.mp3".
    src: "assets/music.mp3",
    volume: 0.15,                  // 0 - 1
    autoStartOnFirstJourney: true // musik mulai saat tombol "Take a Little Journey" disentuh
  },

  /* ============================ CHAPTER 01 ============================== */
  chapter1: {
    label: "Chapter 01",
    title: "The Beginning",
    headline: "Somewhere in this universe...",
    subheadline: "There's someone who might not realize how special they are.",
    button: "Take a Little Journey",
    forLine: "for {recipient}"
  },

  /* ============================ CHAPTER 02 ============================== */
  chapter2: {
    label: "Chapter 02",
    title: "Little Things",
    intro: "Admiration often lives in the smallest things. Touch a card to open it.",
    cards: [
      {
        title: "A Presence",
        message: "Some people make a room feel softer just by being in it. You do that, and I don't think you even try."
      },
      {
        title: "Your Own Way",
        message: "The way you do things is entirely yours. It never looks borrowed, and I find that quietly admirable."
      },
      {
        title: "Little Details",
        message: "Small things stay with me: {memory}. It's the details that make a person feel real."
      },
      {
        title: "The Things You Don't Notice",
        message: "You may not notice the good you carry, the small ways you make things lighter. I do, and it matters."
      }
    ],
    captionIdle: "{opened} of {total} opened",
    captionDone: "You opened them all.",
    next: "Continue"
  },

  /* ============================ CHAPTER 03 ============================== */
  chapter3: {
    label: "Chapter 03",
    title: "Unspoken Words",
    dateLine: "Written on {date}",
    greeting: "Dear {recipient},",
    paragraphs: [
      "Sometimes, admiration doesn't need a reason. It simply happens when you notice the little things about someone.",
      "You may never realize how much inspiration you bring through the way you speak, the way you think, and simply the way you exist.",
      "{message}",
      "I hope you never stop becoming the person you are meant to be."
    ],
    closing: "With quiet admiration,",
    signature: "someone, quietly",
    note: "No reply is needed. This is just something I wanted you to know.",
    next: "Continue"
  },

  /* ============================ CHAPTER 04 ============================== */
  chapter4: {
    label: "Chapter 04",
    title: "A Universe for You",
    intro: "Touch the stars. Each one holds a small wish.",
    idle: "Touch a star to see what it holds.",
    foundLabel: "stars found",
    revealNext: "Reveal the next star",   // tombol untuk pengguna keyboard / pembaca layar
    complete: "You found every star.",
    wishes: [
      "I hope your days feel gentle.",
      "May you always find a reason to smile when you least expect it.",
      "I hope you're as kind to yourself as you deserve.",
      "May the things you're working toward find their way to you.",
      "I hope someone reminds you today how much you matter.",
      "Rest when you're tired. You're allowed to.",
      "Some moments stay with me quietly: {memory}.",
      "Whatever comes, I hope you keep becoming you."
    ],
    next: "Continue"
  },

  /* ===================== SISIPAN — MAKE A WISH ========================= */
  /* Bagian opsional di antara Chapter 04 dan 05. Wish disimpan di browser
     pengunjung saja (localStorage), tidak dikirim atau disinkronkan online. */
  chapterWish: {
    label: "A quiet moment",
    title: "Make a Wish",
    prompt: "If you could wish for one thing tonight, what would it be?",
    placeholder: "Write your wish here...",
    button: "Send to the Stars",
    emptyError: "Write a few words first. Even a small wish counts.",
    confirmation: "Perhaps the universe has heard you.",
    localNote: "Your wish is kept on this device only. It isn't sent or synced anywhere.",
    noStorageNote: "This browser couldn't save your wish, so it will only last until you close this page.",
    another: "Make another wish",
    next: "Continue",
    skip: "Not tonight",
    maxLength: 240
  },

  /* ============================ CHAPTER 05 ============================== */
  chapter5: {
    label: "Chapter 05",
    title: "The Final Reveal",
    prompt: "Every letter has a sender.",
    hint: "Touch the envelope",
    envelopeFor: "For {recipient}",
    revealLine: "It was me.",
    closing: [
      "You don't owe me an answer, or anything at all.",
      "This was only ever meant to be a small, honest thank you for being who you are.",
      "Wherever your days take you, I hope they are kind to you."
    ],
    footer: "{date}",
    replayButton: "Read it again",
    backButton: "Back to the stars"
  }
};
