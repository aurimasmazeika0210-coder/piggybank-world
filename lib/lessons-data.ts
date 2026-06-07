export type LessonQuizQuestion = {
  q: string
  opts: string[]
  correct: number
  exp: string
}

export type LessonDefinition = {
  id: string
  emoji: string
  title: string
  teaser: string
  xp: number
  funFact: string
  content: string[]
  quiz: LessonQuizQuestion[]
}

export const LESSON_BATCH_SIZE = 3

export const LESSONS: LessonDefinition[] = [
  {
    id: "lesson-1",
    emoji: "🌱",
    title: "What is investing?",
    teaser: "Learn how money grows",
    xp: 50,
    funFact:
      "If you invest 100 PiggyCoins today and it grows 10% per year, in 10 years you have 259 coins without doing anything!",
    content: [
      "Investing means putting your money to work so it can grow over time. Instead of just saving coins in a jar, you give them a job!",
      "When you invest you buy a small piece of something hoping it becomes more valuable in the future.",
      "The most important thing about investing is time. The longer you leave your money, the more it can grow — this is called compound growth.",
      "Of course investing has risks — sometimes prices go down. That is why learning first is so important!",
    ],
    quiz: [
      {
        q: "What does investing mean?",
        opts: ["Spending all coins", "Putting money to work so it grows", "Hiding coins under bed"],
        correct: 1,
        exp: "Investing means putting your money to work so it can grow!",
      },
      {
        q: "What helps investments grow most?",
        opts: ["Luck", "Time", "Spending fast"],
        correct: 1,
        exp: "Time is the most powerful force in investing!",
      },
      {
        q: "Is investing risk-free?",
        opts: ["Yes always", "No prices can go down", "Only weekdays"],
        correct: 1,
        exp: "Prices can go up or down — learning first is key!",
      },
    ],
  },
  {
    id: "lesson-2",
    emoji: "📄",
    title: "What is a share?",
    teaser: "Own a piece of a company",
    xp: 50,
    funFact:
      "When you buy a share of Pizza Planet you literally become a part-owner. Every new restaurant they open can make your share more valuable!",
    content: [
      "Imagine Pizza Planet is a giant pizza cut into 100 slices. Each slice is a share. If you buy one you own part of Pizza Planet!",
      "When the company does well your slice becomes more valuable and worth more PiggyCoins.",
      "Companies sell shares to raise money to grow. In return you get to own part of that company.",
      "You can buy and sell shares whenever you want. If the price goes up you profit. If down you lose.",
    ],
    quiz: [
      {
        q: "What is a share?",
        opts: ["A type of pizza", "A small piece of company ownership", "A savings account"],
        correct: 1,
        exp: "A share is like owning one slice of a pizza company!",
      },
      {
        q: "If Pizza Planet opens 10 new restaurants what happens to your share?",
        opts: ["Nothing", "It probably becomes more valuable", "It disappears"],
        correct: 1,
        exp: "Growing companies usually have more valuable shares!",
      },
      {
        q: "Can you sell your shares?",
        opts: ["No keep forever", "Yes whenever you want", "Only Fridays"],
        correct: 1,
        exp: "You can buy and sell shares whenever you like!",
      },
    ],
  },
  {
    id: "lesson-3",
    emoji: "📈",
    title: "Why do prices move?",
    teaser: "Supply, demand, and feelings",
    xp: 75,
    funFact:
      "In 1637 tulip bulbs in Holland were so popular one bulb cost as much as a house! Then suddenly prices crashed.",
    content: [
      "Share prices move because of supply and demand — when lots of people want to buy the price goes up.",
      "News affects prices a lot. If GameZone announces an amazing game more people buy their shares.",
      "Sometimes prices move because of feelings — scared investors sell; excited investors buy.",
      "Smart investors ignore short-term moves and focus on whether the company is good long-term!",
    ],
    quiz: [
      {
        q: "What makes share prices go up?",
        opts: ["Bad weather", "More people wanting to buy", "The day of the week"],
        correct: 1,
        exp: "More buyers usually means a higher price!",
      },
      {
        q: "If GameZone announces a great game what probably happens?",
        opts: ["Price goes down", "Stays same", "Price goes up"],
        correct: 2,
        exp: "Good news often pushes prices up!",
      },
      {
        q: "Should you panic when prices drop a little?",
        opts: ["Yes sell everything", "No think long-term", "Ignore your card"],
        correct: 1,
        exp: "Long-term thinking beats panic!",
      },
    ],
  },
  {
    id: "lesson-4",
    emoji: "💰",
    title: "What is a dividend?",
    teaser: "Get paid for owning",
    xp: 75,
    funFact:
      "Some companies share profits with owners. A dividend is like a thank-you payment for holding their shares!",
    content: [
      "A dividend is money a company pays to people who own its shares.",
      "Not every company pays dividends — some reinvest profits to grow faster instead.",
      "Dividends are usually paid every few months. They reward patient investors.",
      "In PiggyBank World your parent can send you dividend PiggyCoins when investments do well!",
    ],
    quiz: [
      {
        q: "What is a dividend?",
        opts: ["A type of tax", "A payment to shareholders", "A bank fee"],
        correct: 1,
        exp: "Dividends pay shareholders for owning shares!",
      },
      {
        q: "Who might receive a dividend?",
        opts: ["Only the CEO", "People who own shares", "Random strangers"],
        correct: 1,
        exp: "Share owners can receive dividends!",
      },
      {
        q: "Do all companies pay dividends?",
        opts: ["Yes always", "No some reinvest instead", "Only on Mondays"],
        correct: 1,
        exp: "Some companies keep profits to grow!",
      },
    ],
  },
  {
    id: "lesson-5",
    emoji: "⚠️",
    title: "What is risk?",
    teaser: "Understanding ups and downs",
    xp: 100,
    funFact:
      "Even great companies have bad days. Risk means the value of your investment can go down as well as up.",
    content: [
      "Risk means you might lose some PiggyCoins if prices fall.",
      "Higher potential reward often comes with higher risk.",
      "You can lower risk by learning, diversifying, and not investing money you need right away.",
      "Never invest more than you and your parent are comfortable with!",
    ],
    quiz: [
      {
        q: "What is investment risk?",
        opts: ["Guaranteed profit", "Chance of losing money", "Free coins daily"],
        correct: 1,
        exp: "Risk means outcomes are uncertain!",
      },
      {
        q: "How can you reduce risk?",
        opts: ["Buy only one stock", "Diversify and learn first", "Never check prices"],
        correct: 1,
        exp: "Learning and diversifying helps manage risk!",
      },
      {
        q: "If a price drops 5% in one day you should…",
        opts: ["Always panic sell", "Think calmly long-term", "Close the app forever"],
        correct: 1,
        exp: "Stay calm and think long-term!",
      },
    ],
  },
  {
    id: "lesson-6",
    emoji: "🧺",
    title: "Build your portfolio",
    teaser: "Diversify your investments",
    xp: 100,
    funFact:
      "Portfolio is a fancy word for your collection of investments. Don't put all your eggs in one basket!",
    content: [
      "A portfolio is everything you own: shares in different companies.",
      "Diversifying means spreading money across several companies so one bad day hurts less.",
      "If Pizza Planet has a slow week but GameZone does great, your portfolio can still be healthy.",
      "Check the Market tab to build a balanced mix!",
    ],
    quiz: [
      {
        q: "What is a portfolio?",
        opts: ["A paper folder", "Your collection of investments", "A type of loan"],
        correct: 1,
        exp: "Your portfolio is all your investments together!",
      },
      {
        q: "Why diversify?",
        opts: ["To own one company only", "To spread risk", "To avoid learning"],
        correct: 1,
        exp: "Spreading investments lowers risk!",
      },
      {
        q: "Owning shares in 3 different companies is…",
        opts: ["Too risky", "More diversified", "Impossible"],
        correct: 1,
        exp: "Multiple companies = more diversified!",
      },
    ],
  },
  {
    id: "lesson-7",
    emoji: "⚡",
    title: "The Rule of 72",
    teaser: "How fast money doubles",
    xp: 125,
    funFact:
      "If your investment grows at 8% per year, divide 72 by 8 = 9. That means your money doubles in just 9 years — without doing anything extra!",
    content: [
      "The Rule of 72 is a magical shortcut that tells you how long it takes for your money to double when it is invested.",
      "The formula is simple: divide 72 by the interest rate (the percentage your money grows each year). The answer is the number of years to double.",
      "Example: if your savings account pays 6% per year, then 72 ÷ 6 = 12 years to double. If it pays 12% per year, then 72 ÷ 12 = 6 years!",
      "The Rule of 72 shows why a higher return rate and starting early are so powerful. The sooner you invest and the better the return, the faster your money doubles.",
    ],
    quiz: [
      {
        q: "If your investment grows at 9% per year, how many years to double using the Rule of 72?",
        opts: ["6 years", "8 years", "9 years"],
        correct: 1,
        exp: "72 ÷ 9 = 8 years! The Rule of 72 makes this calculation instant.",
      },
      {
        q: "You want your money to double in 6 years. What annual return rate do you need?",
        opts: ["10%", "12%", "15%"],
        correct: 1,
        exp: "72 ÷ 6 = 12% annual return needed!",
      },
      {
        q: "Why is starting to invest early so important?",
        opts: ["It is not important", "More time means more doublings", "Banks pay more to young people"],
        correct: 1,
        exp: "Every doubling multiplies your money. More years = more doublings = much more money!",
      },
    ],
  },
  {
    id: "lesson-8",
    emoji: "💸",
    title: "What is inflation?",
    teaser: "Prices rise over time",
    xp: 100,
    funFact:
      "In 1970 a chocolate bar cost about 5 cents. Today the same bar costs over €1.50. That is inflation making everything more expensive over time!",
    content: [
      "Inflation means prices go up over time. What costs €1 today might cost €1.10 next year.",
      "This is why keeping all your money under the mattress is actually losing value — it buys less each year.",
      "Investing helps beat inflation. If inflation is 3% per year and your investment grows 8%, you are actually getting richer by 5% per year.",
      "Governments try to keep inflation around 2% per year. When inflation is too high, things become unaffordable very fast.",
    ],
    quiz: [
      {
        q: "What does inflation mean?",
        opts: ["Prices going down", "Prices going up over time", "Banks making more money"],
        correct: 1,
        exp: "Inflation means prices rise over time.",
      },
      {
        q: "If inflation is 5% and your savings earn 2%, what happens?",
        opts: ["You get richer", "You lose purchasing power", "Nothing changes"],
        correct: 1,
        exp: "Your money grows slower than prices — you can buy less.",
      },
      {
        q: "What is the best way to protect money from inflation?",
        opts: ["Keep cash at home", "Invest it so it grows faster than inflation", "Buy lots of food"],
        correct: 1,
        exp: "Investing can help your money grow faster than rising prices.",
      },
    ],
  },
  {
    id: "lesson-9",
    emoji: "🏦",
    title: "Saving vs investing",
    teaser: "Know the difference",
    xp: 75,
    funFact:
      "Saving is safe but grows slowly. Investing can grow faster but has ups and downs!",
    content: [
      "Saving keeps coins safe in one place with little change.",
      "Investing puts coins to work where they can grow faster.",
      "Many people save for short goals and invest for long goals.",
      "PiggyCoins on your card can be saved or invested in the Market!",
    ],
    quiz: [
      {
        q: "Saving usually means…",
        opts: ["High risk every day", "Keeping money safe", "Only buying shares"],
        correct: 1,
        exp: "Saving focuses on safety!",
      },
      {
        q: "Investing is best for…",
        opts: ["Long-term goals", "Losing money on purpose", "Never learning"],
        correct: 0,
        exp: "Investing often helps long-term goals!",
      },
      {
        q: "Can you do both saving and investing?",
        opts: ["No pick one", "Yes many people do", "Only parents can"],
        correct: 1,
        exp: "You can save and invest!",
      },
    ],
  },
  {
    id: "lesson-10",
    emoji: "📊",
    title: "How to read a price chart",
    teaser: "Up, down, and trends",
    xp: 125,
    funFact:
      "A chart is like a story of a company's price — each point shows where the price was on a given day!",
    content: [
      "A price chart shows how a share's price changed over time. The line going up means the price rose; down means it fell.",
      "Short bumps are normal. Smart investors look at the overall trend over weeks, not just one day.",
      "In the Market tab you will see mini charts for each company — use them to spot whether prices have been rising or falling lately.",
      "Never buy only because a line went up today. Always think about the company and talk to your parent!",
    ],
    quiz: [
      {
        q: "If a chart line goes up over a month, what does that usually mean?",
        opts: ["The price fell", "The price rose over that period", "The company closed"],
        correct: 1,
        exp: "An upward trend means prices increased over time.",
      },
      {
        q: "Should you panic if the chart dips for one day?",
        opts: ["Yes sell immediately", "No look at the bigger picture", "Ignore your parent"],
        correct: 1,
        exp: "One-day moves are normal — look at longer trends.",
      },
      {
        q: "Before buying shares you should…",
        opts: ["Only look at emojis", "Learn and talk to your parent", "Buy the most expensive stock"],
        correct: 1,
        exp: "Learning and family guidance matter most!",
      },
    ],
  },
]

export function emptyLessonStars(): number[] {
  return Array(LESSONS.length).fill(0)
}

export function investmentXpFromStars(stars: number[]): number {
  return LESSONS.reduce((sum, lesson, i) => {
    const s = stars[i] ?? 0
    if (s <= 0) return sum
    return sum + Math.round((lesson.xp * s) / 3)
  }, 0)
}

export function isLessonUnlocked(lessonIndex: number, stars: number[]): boolean {
  const batch = Math.floor(lessonIndex / LESSON_BATCH_SIZE)
  if (batch === 0) return true
  for (let b = 0; b < batch; b++) {
    const start = b * LESSON_BATCH_SIZE
    const end = start + LESSON_BATCH_SIZE
    for (let i = start; i < end; i++) {
      if ((stars[i] ?? 0) < 3) return false
    }
  }
  return true
}

export function batchLabel(lessonIndex: number): string {
  const batch = Math.floor(lessonIndex / LESSON_BATCH_SIZE) + 1
  return `Set ${batch}`
}

export function unlockHint(lessonIndex: number): string {
  const batch = Math.floor(lessonIndex / LESSON_BATCH_SIZE)
  if (batch === 0) return ""
  const prevStart = (batch - 1) * LESSON_BATCH_SIZE + 1
  const prevEnd = batch * LESSON_BATCH_SIZE
  return `Get 3 stars on lessons ${prevStart}–${prevEnd} to unlock`
}
