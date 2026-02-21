import { usersCol, activitiesCol, db, addDoc, getDocs, query, where, setDoc } from '../firebase/config'
import { calculateReadinessScore } from './readinessScore'
import { collection, doc } from 'firebase/firestore'

// Seed sample data if empty. Call this from the app for testing only.
export async function seedSampleData() {
  // check users
  const usersSnap = await getDocs(usersCol)
  if (usersSnap.size === 0) {
    const sampleUsers = [
      { uid: 'u_admin', name: 'Admin User', email: 'admin@example.com', role: 'admin', readinessScore: 0, streak: 0 },
      { uid: 'u_john', name: 'John Doe', email: 'john@example.com', role: 'student', readinessScore: 0, lastActiveDate: new Date(), streak: 3 },
      { uid: 'u_jane', name: 'Jane Smith', email: 'jane@example.com', role: 'student', readinessScore: 0, lastActiveDate: new Date(), streak: 6 },
    ]
    for (const u of sampleUsers) {
      const ref = doc(db, 'Users', u.uid)
      await setDoc(ref, u)
    }
    console.log('Seeded Users')
  }

  const actsSnap = await getDocs(activitiesCol)
  if (actsSnap.size === 0) {
    const sampleActivities = [
      { uid: 'u_john', date: new Date(), codingProblemsSolved: 5, aptitudeHours: 1, coreTopicsCovered: 2, softSkillsPractice: 0 },
      { uid: 'u_jane', date: new Date(), codingProblemsSolved: 12, aptitudeHours: 3, coreTopicsCovered: 4, softSkillsPractice: 2 },
    ]
    for (const a of sampleActivities) {
      await addDoc(activitiesCol, a)
    }
    console.log('Seeded Activities')
  }

  // compute readiness for all students
  const allUsers = await getDocs(usersCol)
  for (const u of allUsers.docs) {
    const data = u.data()
    if (data.role !== 'student') continue
    // aggregate activities
    const q = query(activitiesCol, where('uid', '==', u.id))
    const snaps = await getDocs(q)
    let totals = { codingProblemsSolved: 0, aptitudeHours: 0, coreTopicsCovered: 0, softSkillsPractice: 0 }
    snaps.forEach(s => {
      const d = s.data()
      totals.codingProblemsSolved += d.codingProblemsSolved || 0
      totals.aptitudeHours += d.aptitudeHours || 0
      totals.coreTopicsCovered += d.coreTopicsCovered || 0
      totals.softSkillsPractice += d.softSkillsPractice || 0
    })
    const readiness = calculateReadinessScore(totals, data.streak || 0)
    // update user doc
    const ref = doc(db, 'Users', u.id)
    await setDoc(ref, { ...data, readinessScore: readiness }, { merge: true })
    console.log(`Updated readiness for ${u.id}: ${readiness}`)
  }
}
