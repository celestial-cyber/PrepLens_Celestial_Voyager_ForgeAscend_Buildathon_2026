export const STUDY_CATALOG = {
  aptitude: {
    label: 'Aptitude',
    topics: {
      reasoning: {
        label: 'Reasoning',
        chapters: ['Syllogism', 'Blood Relations', 'Series'],
      },
      quantitative: {
        label: 'Quantitative Aptitude',
        chapters: ['Percentages', 'Time and Work', 'Profit and Loss'],
      },
    },
  },
  coding: {
    label: 'Coding',
    topics: {
      dsa: {
        label: 'DSA',
        chapters: ['Arrays', 'Linked List', 'Trees'],
      },
      algorithms: {
        label: 'Algorithms',
        chapters: ['Sorting', 'Searching', 'Dynamic Programming'],
      },
    },
  },
  core: {
    label: 'Core Subjects',
    topics: {
      dbms: {
        label: 'DBMS',
        chapters: ['Normalization', 'SQL Joins', 'Transactions'],
      },
      os: {
        label: 'Operating Systems',
        chapters: ['Process Scheduling', 'Deadlocks', 'Memory Management'],
      },
    },
  },
  'soft-skills': {
    label: 'Soft Skills',
    topics: {
      communication: {
        label: 'Communication',
        chapters: ['Email Writing', 'Presentation', 'Listening'],
      },
      interview: {
        label: 'Interview Prep',
        chapters: ['HR Questions', 'Body Language', 'Self Introduction'],
      },
    },
  },
};

export function categoryOptions() {
  return Object.entries(STUDY_CATALOG).map(([value, section]) => ({
    value,
    label: section.label,
  }));
}

export function topicOptions(category) {
  if (!category || !STUDY_CATALOG[category]) return [];
  return Object.entries(STUDY_CATALOG[category].topics).map(([value, topic]) => ({
    value,
    label: topic.label,
  }));
}

export function chapterOptions(category, topic) {
  if (!category || !topic) return [];
  const chapterList = STUDY_CATALOG[category]?.topics?.[topic]?.chapters || [];
  return chapterList.map((item) => ({ value: item, label: item }));
}
