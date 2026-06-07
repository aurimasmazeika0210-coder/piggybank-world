import { NEW_CHILD_STARTING_TRUSTY_SCORE } from "@/lib/auth"
import { sql, CHALLENGE_TYPES, type Challenge, type ChallengeEventType } from "@/lib/db"
import { getHoldStreak, setHoldStreak, getLastCheckDate, setLastCheckDate, setFirstInvestmentDate } from "@/lib/redis"

export interface ChallengeProgress {
  id: string
  title: string
  description: string
  icon: string | null
  xpReward: number
  currentProgress: number
  targetValue: number
  progressPercent: number
  isCompleted: boolean
  completedAt: string | null
}

export interface ChallengeCompleteResult {
  challengeId: string
  title: string
  xpAwarded: number
  newTrustyScore: number
}

// Initialize challenges for a new user
async function ensureUserChallenges(childId: string): Promise<void> {
  const challenges = await sql`SELECT id FROM challenges` as Array<{ id: string }>
  
  for (const challenge of challenges) {
    await sql`
      INSERT INTO user_challenges (child_id, challenge_id, current_progress)
      VALUES (${childId}, ${challenge.id}, 0)
      ON CONFLICT (child_id, challenge_id) DO NOTHING
    `
  }
}

// Ensure user has a wallet
async function ensureWallet(childId: string): Promise<void> {
  await sql`
    INSERT INTO wallets (child_id, xp_balance, trusty_score)
    VALUES (${childId}, 0, ${NEW_CHILD_STARTING_TRUSTY_SCORE})
    ON CONFLICT (child_id) DO NOTHING
  `
}

// Challenge XP boosts Trusty Score only — spendable PC comes from parent top-ups and lesson rewards.
async function awardChallengeTrustyScore(
  childId: string,
  xp: number
): Promise<{ newTrustyScore: number }> {
  await ensureWallet(childId)

  const trustyIncrease = Math.max(1, Math.floor(xp / 100))
  await sql`
    UPDATE wallets
    SET trusty_score = LEAST(trusty_score + ${trustyIncrease}, 100), updated_at = NOW()
    WHERE child_id = ${childId}
  `

  const wallet = (await sql`
    SELECT trusty_score FROM wallets WHERE child_id = ${childId}
  `) as Array<{ trusty_score: number }>

  return {
    newTrustyScore: Number(wallet[0]?.trusty_score ?? 50),
  }
}

// Mark challenge as complete
async function completeChallenge(childId: string, challengeId: string): Promise<ChallengeCompleteResult | null> {
  // Get challenge details
  const challenges = await sql`
    SELECT c.id, c.title, c.xp_reward, uc.is_completed
    FROM challenges c
    JOIN user_challenges uc ON uc.challenge_id = c.id
    WHERE c.id = ${challengeId} AND uc.child_id = ${childId}
  ` as Array<{ id: string; title: string; xp_reward: number; is_completed: boolean }>
  
  const challenge = challenges[0]
  if (!challenge || challenge.is_completed) {
    return null
  }
  
  // Mark as complete
  await sql`
    UPDATE user_challenges 
    SET is_completed = TRUE, completed_at = NOW()
    WHERE child_id = ${childId} AND challenge_id = ${challengeId}
  `
  
  const { newTrustyScore } = await awardChallengeTrustyScore(childId, Number(challenge.xp_reward))
  
  return {
    challengeId: challenge.id,
    title: challenge.title,
    xpAwarded: Number(challenge.xp_reward),
    newTrustyScore,
  }
}

// Send Firebase push notification (mock implementation)
async function sendPushNotification(childId: string, title: string, body: string): Promise<void> {
  // In production, this would use Firebase Admin SDK
  console.log(`[Push Notification] To: ${childId}, Title: ${title}, Body: ${body}`)
  // Example Firebase implementation:
  // import { getMessaging } from "firebase-admin/messaging"
  // const token = await getUserFCMToken(childId)
  // await getMessaging().send({ token, notification: { title, body } })
}

// Check and update challenge progress
async function updateChallengeProgress(
  childId: string,
  challengeType: string,
  newProgress: number
): Promise<ChallengeCompleteResult | null> {
  // Get challenge for this type
  const challenges = await sql`
    SELECT c.id, c.title, c.target_value, c.xp_reward, uc.current_progress, uc.is_completed
    FROM challenges c
    JOIN user_challenges uc ON uc.challenge_id = c.id
    WHERE c.challenge_type = ${challengeType} AND uc.child_id = ${childId}
  ` as Array<{
    id: string
    title: string
    target_value: number
    xp_reward: number
    current_progress: number
    is_completed: boolean
  }>
  
  const challenge = challenges[0]
  if (!challenge || challenge.is_completed) {
    return null
  }
  
  // Update progress
  await sql`
    UPDATE user_challenges 
    SET current_progress = ${newProgress}
    WHERE child_id = ${childId} AND challenge_id = ${challenge.id}
  `
  
  // Check if completed
  if (newProgress >= Number(challenge.target_value)) {
    const result = await completeChallenge(childId, challenge.id)
    if (result) {
      await sendPushNotification(
        childId,
        "Challenge Complete!",
        `You completed "${challenge.title}" and earned ${challenge.xp_reward} XP!`
      )
    }
    return result
  }
  
  return null
}

// Main function to check challenge progress after events
export async function checkChallengeProgress(
  childId: string,
  eventType: ChallengeEventType
): Promise<ChallengeCompleteResult[]> {
  try {
    await ensureUserChallenges(childId)
    const completedChallenges: ChallengeCompleteResult[] = []

    switch (eventType) {
    case "buy": {
      // Check "Buy Your First Share" challenge
      const portfolioCount = await sql`
        SELECT COUNT(*) as count FROM portfolio WHERE child_id = ${childId} AND shares > 0
      ` as Array<{ count: string }>
      const totalHoldings = parseInt(portfolioCount[0]?.count ?? "0", 10)
      
      if (totalHoldings >= 1) {
        const result = await updateChallengeProgress(childId, CHALLENGE_TYPES.FIRST_BUY, 1)
        if (result) completedChallenges.push(result)
        
        // Record first investment date for streak tracking
        await setFirstInvestmentDate(childId, new Date().toISOString().split("T")[0])
      }
      
      // Check "Diversify Portfolio" challenge
      const uniqueCompanies = await sql`
        SELECT COUNT(DISTINCT company_id) as count FROM portfolio WHERE child_id = ${childId} AND shares > 0
      ` as Array<{ count: string }>
      const diversityCount = parseInt(uniqueCompanies[0]?.count ?? "0", 10)
      
      const diversifyResult = await updateChallengeProgress(childId, CHALLENGE_TYPES.DIVERSIFY, diversityCount)
      if (diversifyResult) completedChallenges.push(diversifyResult)
      
      break
    }
    
    case "sell": {
      // "Make a Profit" challenge is checked with additional profit info
      // This will be called from the sell endpoint with profit data
      break
    }
    
    case "lesson_quiz": {
      // Check "Complete 3 Lessons" challenge
      const lessonCount = await sql`
        SELECT COUNT(*) as count FROM lesson_progress 
        WHERE child_id = ${childId} AND quiz_passed = TRUE
      ` as Array<{ count: string }>
      const passedLessons = parseInt(lessonCount[0]?.count ?? "0", 10)
      
      const result = await updateChallengeProgress(childId, CHALLENGE_TYPES.LESSONS, passedLessons)
      if (result) completedChallenges.push(result)
      
      break
    }
    
    case "daily_check": {
      // Check "Hold for 7 Days" streak challenge using Redis
      const today = new Date().toISOString().split("T")[0]
      const lastCheck = await getLastCheckDate(childId)
      
      // Check if user has any holdings
      const hasHoldings = await sql`
        SELECT COUNT(*) as count FROM portfolio WHERE child_id = ${childId} AND shares > 0
      ` as Array<{ count: string }>
      
      if (parseInt(hasHoldings[0]?.count ?? "0", 10) > 0) {
        if (lastCheck !== today) {
          // New day - increment streak
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split("T")[0]
          
          let currentStreak = await getHoldStreak(childId)
          
          if (lastCheck === yesterdayStr) {
            // Consecutive day - increment streak
            currentStreak += 1
          } else if (!lastCheck) {
            // First check ever
            currentStreak = 1
          } else {
            // Streak broken - but they still have holdings, so start fresh
            currentStreak = 1
          }
          
          await setHoldStreak(childId, currentStreak)
          await setLastCheckDate(childId, today)
          
          // Update challenge progress
          const result = await updateChallengeProgress(childId, CHALLENGE_TYPES.HOLD_STREAK, currentStreak)
          if (result) completedChallenges.push(result)
        }
      } else {
        // No holdings - reset streak
        await setHoldStreak(childId, 0)
      }
      
      break
    }
    }

    return completedChallenges
  } catch (e) {
    console.error("[challenge] checkChallengeProgress failed:", e)
    return []
  }
}

// Check profit on sell
export async function checkProfitChallenge(
  childId: string,
  sellPrice: number,
  avgBuyPrice: number
): Promise<ChallengeCompleteResult | null> {
  if (sellPrice > avgBuyPrice) {
    return updateChallengeProgress(childId, CHALLENGE_TYPES.PROFIT, 1)
  }
  return null
}

// Get all challenges with progress for a user
export async function getChallengesWithProgress(childId: string): Promise<ChallengeProgress[]> {
  await ensureUserChallenges(childId)
  
  // Get hold streak from Redis for the streak challenge
  const holdStreak = await getHoldStreak(childId)
  
  const results = await sql`
    SELECT 
      c.id, c.title, c.description, c.icon, c.xp_reward, c.target_value, c.challenge_type,
      uc.current_progress, uc.is_completed, uc.completed_at
    FROM challenges c
    LEFT JOIN user_challenges uc ON uc.challenge_id = c.id AND uc.child_id = ${childId}
    ORDER BY c.created_at
  ` as Array<{
    id: string
    title: string
    description: string
    icon: string | null
    xp_reward: number
    target_value: number
    challenge_type: string
    current_progress: number | null
    is_completed: boolean | null
    completed_at: string | null
  }>
  
  return results.map(r => {
    // Use Redis streak for hold streak challenge
    const progress = r.challenge_type === CHALLENGE_TYPES.HOLD_STREAK 
      ? holdStreak 
      : (r.current_progress ?? 0)
    
    const targetValue = Number(r.target_value)
    const progressPercent = Math.min(Math.round((progress / targetValue) * 100), 100)
    
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      icon: r.icon,
      xpReward: Number(r.xp_reward),
      currentProgress: progress,
      targetValue,
      progressPercent,
      isCompleted: r.is_completed ?? false,
      completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
    }
  })
}

// Get user wallet/XP info
export async function getWallet(childId: string): Promise<{
  xpBalance: number
  trustyScore: number
}> {
  await ensureWallet(childId)
  
  const wallet = await sql`
    SELECT xp_balance, trusty_score FROM wallets WHERE child_id = ${childId}
  ` as Array<{ xp_balance: number; trusty_score: number }>
  
  return {
    xpBalance: Number(wallet[0]?.xp_balance ?? 0),
    trustyScore: Number(wallet[0]?.trusty_score ?? 50),
  }
}
