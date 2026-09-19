import type { CommonsTemplate } from '@/services/lms/types/lms.types';

// Static Commons catalog. This file is the sole source of the commons
// templates (previously duplicated from the legacy seed JSON).
export const commonsTemplates: CommonsTemplate[] = [
  {
    id: 'com-1',
    title: 'CHED CMO 25 s. 2015 Compliant BSCS Course Syllabus Template',
    category: 'Syllabus Shell',
    description: 'Standardized outcome-based syllabus structure for Computer Science core subjects in DMMMSU-SLUC.',
    author: 'College Academic Quality Assurance Office',
    downloads: 142,
    rating: 4.9,
    tags: ['CHED', 'Syllabus', 'Outcome-Based', 'BSCS'],
    chedAlignment: 'CMO 25 s. 2015 - Section 8'
  },
  {
    id: 'com-2',
    title: 'Web Engineering Lab Manual & Automated Grading Rubric',
    category: 'Lab Module',
    description: 'Complete laboratory exercise set with attached multi-criterion SpeedGrader rubrics.',
    author: 'Prof. Arnel V. Zabala',
    downloads: 89,
    rating: 4.8,
    tags: ['Web Engineering', 'React', 'Rubric', 'SpeedGrader'],
    chedAlignment: 'CMO 25 s. 2015 - Section 8.2'
  },
  {
    id: 'com-3',
    title: 'Capstone Project Defense Assessment Matrix & Rubric',
    category: 'Assessment Rubric',
    description: 'Standardized panel defense rating sheet aligned with Likha ERP capstone tracking.',
    author: 'Dr. Charlie S. Marzan',
    downloads: 210,
    rating: 5.0,
    tags: ['Capstone', 'Thesis', 'Rubric', 'Evaluation'],
    chedAlignment: 'CMO 25 s. 2015 - Section 11.0'
  }
];
