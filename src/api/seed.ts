import { weekStart } from './model'
import type { Application, ApplicationForm, StaffUser, Status } from './model'

export const staffUser: StaffUser = {
  id: 'staff-jamie-morgan',
  name: 'Jamie Morgan',
  role: 'Adoption Coordinator',
  email: 'jamie@gap.example',
}
export const samplePassword = 'Greyhound2026!'

export function seedApplications(now = new Date()): Application[] {
  const start = weekStart(now)
  const past = (days: number, hour = 9) => {
    const d = new Date(start)
    d.setDate(d.getDate() + days)
    d.setHours(hour, 0, 0, 0)
    return new Date(Math.min(d.getTime(), now.getTime() - 60000)).toISOString()
  }
  const profiles: Array<Partial<ApplicationForm> & { fullName: string }> = [
    {
      fullName: 'Olivia Bennett',
      dateOfBirth: '14/05/1991',
      address: '18 Tanner Street, Richmond VIC 3121',
      phone: '0412 684 295',
      dogExperience:
        'I cared for our rescue Labrador for twelve years, including regular veterinary appointments, daily exercise and medication in his later years.',
      hasCurrentPets: 'Yes',
      currentPetsDetails:
        'One desexed indoor cat, aged six. We can provide separate spaces during introductions.',
    },
    {
      fullName: 'Daniel Cooper',
      applicationType: 'Foster',
      dateOfBirth: '22/08/1984',
      address: '9 Eleanor Street, Footscray VIC 3011',
      phone: '0431 805 164',
      residenceType: 'Apartment',
      housingStatus: 'Rent',
      landlordPermission: 'Yes',
      secureYard: 'No',
      adultsInHome: '1',
      dogExperience:
        'I volunteered at a local animal shelter for three years, walking and caring for medium and large dogs.',
    },
    {
      fullName: 'Priya Sharma',
      dateOfBirth: '03/12/1988',
      address: '26 Blythe Street, Brunswick VIC 3056',
      phone: '0408 317 492',
      residenceType: 'Townhouse',
      housingStatus: 'Rent',
      landlordPermission: 'Yes',
      childrenInHome: '1',
      greyhoundExperience: 'Yes',
      hasCurrentPets: 'Yes',
      currentPetsDetails: 'One calm beagle, aged ten.',
      dogExperience:
        'Our family has cared for a beagle for nine years. We have experience with medication, dietary management and daily exercise.',
    },
    {
      fullName: 'Liam Wilson',
      dateOfBirth: '19/02/1979',
      address: '44 Mercer Parade, Geelong VIC 3220',
      phone: '0426 930 587',
      childrenInHome: '2',
      greyhoundExperience: 'Yes',
      dogExperience:
        'I have owned dogs for over fifteen years and help with weekend walking at a rescue centre.',
    },
    {
      fullName: 'Sophie Taylor',
      applicationType: 'Foster',
      dateOfBirth: '27/06/1994',
      address: '71 Palmerston Street, Carlton VIC 3053',
      phone: '0450 218 663',
      residenceType: 'Townhouse',
      housingStatus: 'Rent',
      landlordPermission: 'No',
      dogExperience:
        'I grew up with two family dogs and have cared for friends’ dogs over the past four years.',
    },
  ]
  const names = [
    'Noah Thompson',
    'Amelia Clarke',
    'Jack Williams',
    'Isla Roberts',
    'Lucas Edwards',
    'Grace Turner',
    'Oliver Harris',
    'Mia Campbell',
    'Henry Mitchell',
    'Charlotte Scott',
    'Ethan Phillips',
    'Ava Parker',
    'Leo Anderson',
    'Zoe Collins',
    'Thomas Walker',
    'Emily King',
    'William Wright',
    'Chloe Adams',
    'James Lewis',
    'Ella Green',
    'Samuel Baker',
    'Lily Nelson',
    'Alexander Hill',
    'Ruby Allen',
    'Benjamin Young',
    'Evie Carter',
    'Harrison Moore',
    'Georgia Hall',
    'Oscar Davis',
    'Lucy Martin',
    'Archie Hughes',
    'Matilda Wood',
    'Max Robinson',
    'Harper Johnson',
    'Charlie White',
    'Alice Brown',
    'George Wilson',
    'Eleanor Lee',
    'Finn Thompson',
    'Violet James',
    'Arthur Wilson',
    'Rose Morgan',
    'Sebastian Ryan',
  ]
  const statuses: Status[] = [
    'pending',
    'in_review',
    'more_information',
    'approved',
    'rejected',
    ...Array<Status>(11).fill('pending'),
    ...Array<Status>(5).fill('in_review'),
    ...Array<Status>(25).fill('approved'),
    'rejected',
    'rejected',
  ]
  const slots = [0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 5]
  const dates = slots
    .filter((day) => day <= (now.getDay() + 6) % 7)
    .map((d, i) => past(d, 8 + (i % 4)))
    .sort((a, b) => b.localeCompare(a))
  return statuses.map((status, i) => {
    const profile = profiles[i] || { fullName: names[i - 5] }
    const submittedAt = dates[i] || past(-1 - i, 10)
    const form: ApplicationForm = {
      dateOfBirth: '16/04/1989',
      email:
        profile.fullName.toLowerCase().replaceAll(' ', '.') + '@example.com',
      phone: `0400 200 ${String(i + 100)}`,
      address: `${i + 12} Victoria Street, Melbourne VIC 3000`,
      residenceType: 'House',
      housingStatus: 'Own',
      landlordPermission: 'Not applicable',
      adultsInHome: '2',
      childrenInHome: '0',
      secureYard: 'Yes',
      applicationType: i % 3 === 0 ? 'Foster' : 'Adoption',
      dogExperience:
        'I have cared for family dogs and understand the need for regular exercise, training, veterinary care and a calm home.',
      greyhoundExperience: 'No',
      hasCurrentPets: 'No',
      currentPetsDetails: '',
      confirmAccurate: true,
      ...profile,
    }
    if (i === 0 || i === 2 || i === 3) form.applicationType = 'Adoption'
    const history: Application['history'] = [
      {
        id: `submitted-${i}`,
        at: submittedAt,
        status: 'pending',
        author: form.fullName,
        note: 'Application submitted.',
      },
    ]
    if (status !== 'pending') {
      const completedThisWeek = [3, 4, 21, 22, 23].includes(i)
      const at = completedThisWeek
        ? past(Math.min(4, (now.getDay() + 6) % 7), 10)
        : new Date(new Date(submittedAt).getTime() + 1000).toISOString()
      history.push({
        id: `reviewed-${i}`,
        at,
        status,
        author: staffUser.name,
        note:
          status === 'more_information'
            ? 'Please provide confirmation of permission to keep a greyhound at your rental property.'
            : status === 'rejected'
              ? 'Property permission has not been provided. The application cannot proceed at this time.'
              : status === 'approved'
                ? 'Application reviewed and approved.'
                : 'Review started.',
      })
    }
    return {
      id: `GAP-2026-${String(48 - i).padStart(3, '0')}`,
      form,
      submittedAt,
      updatedAt: history.at(-1)!.at,
      status,
      revision: 1,
      history,
    }
  })
}
