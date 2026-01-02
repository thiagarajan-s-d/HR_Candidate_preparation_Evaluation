import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Code, Brain, Users, Wrench, Building, Bug, Lightbulb, FileText } from 'lucide-react';
import { InterviewConfig, AppMode, QuestionType, QuestionTypeOption } from '../types';

interface ConfigFormProps {
  mode: AppMode;
  onSubmit: (config: InterviewConfig) => void;
  loading: boolean;
}

const questionTypeOptions: QuestionTypeOption[] = [
  {
    id: 'technical-coding',
    label: 'Technical Coding',
    description: 'Algorithm and data structure problems',
    icon: 'Code'
  },
  {
    id: 'technical-concepts',
    label: 'Technical Concepts',
    description: 'Theory and fundamental concepts',
    icon: 'Brain'
  },
  {
    id: 'system-design',
    label: 'System Design',
    description: 'Architecture and scalability questions',
    icon: 'Building'
  },
  {
    id: 'behavioral',
    label: 'Behavioral',
    description: 'Soft skills and experience-based questions',
    icon: 'Users'
  },
  {
    id: 'problem-solving',
    label: 'Problem Solving',
    description: 'Logical reasoning and analytical thinking',
    icon: 'Lightbulb'
  },
  {
    id: 'case-study',
    label: 'Case Study',
    description: 'Real-world scenario analysis',
    icon: 'FileText'
  },
  {
    id: 'architecture',
    label: 'Architecture',
    description: 'Software design patterns and architecture',
    icon: 'Wrench'
  },
  {
    id: 'debugging',
    label: 'Debugging',
    description: 'Code review and troubleshooting',
    icon: 'Bug'
  }
];

const getIcon = (iconName: string) => {
  const icons = {
    Code, Brain, Users, Wrench, Building, Bug, Lightbulb, FileText
  };
  return icons[iconName as keyof typeof icons] || Code;
};

export const ConfigForm: React.FC<ConfigFormProps> = ({ mode, onSubmit, loading }) => {
  const [config, setConfig] = useState<InterviewConfig>({
    role: 'Senior Software Engineer',
    company: 'Google',
    skills: ['React', 'JavaScript', 'Node.js'],
    proficiencyLevel: 'intermediate',
    numberOfQuestions: mode === 'evaluate' ? 25 : 10,
    questionTypes: ['technical-coding', 'technical-concepts']
  });
  
  const [skillInput, setSkillInput] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const addSkill = () => {
    if (skillInput.trim() && !config.skills.includes(skillInput.trim())) {
      setConfig(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setConfig(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const toggleQuestionType = (type: QuestionType) => {
    setConfig(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    console.log('Form submitted with config:', config);
    
    if (isFormValid) {
      onSubmit(config);
    } else {
      console.log('Form validation failed:', {
        role: config.role.trim(),
        company: config.company.trim(),
        skills: config.skills.length,
        questionTypes: config.questionTypes.length
      });
    }
  };

  const isFormValid = config.role.trim() !== '' && 
                     config.company.trim() !== '' && 
                     config.skills.length > 0 && 
                     config.questionTypes.length > 0;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Configure Your {mode.charAt(0).toUpperCase() + mode.slice(1)} Session
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Role *
            </label>
            <input
              type="text"
              value={config.role}
              onChange={(e) => setConfig(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., Senior Software Engineer"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Company *
            </label>
            <input
              type="text"
              value={config.company}
              onChange={(e) => setConfig(prev => ({ ...prev, company: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., Google, Microsoft, Amazon"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Skills & Technologies *
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., React, Python, System Design"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {config.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="hover:text-blue-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
          {hasAttemptedSubmit && config.skills.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              Add at least one skill to continue
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Question Types * <span className="text-gray-500">(Select at least one)</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
            {questionTypeOptions.map((option) => {
              const Icon = getIcon(option.icon);
              const isSelected = config.questionTypes.includes(option.id);
              
              return (
                <div
                  key={option.id}
                  onClick={() => toggleQuestionType(option.id)}
                  className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm ${isSelected ? 'text-blue-800' : 'text-gray-900'}`}>
                        {option.label}
                      </h4>
                      <p className={`text-xs mt-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {hasAttemptedSubmit && config.questionTypes.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              Please select at least one question type
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proficiency Level
            </label>
            <select
              value={config.proficiencyLevel}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                proficiencyLevel: e.target.value as any 
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          
          {mode !== 'evaluate' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>
              <select
                value={config.numberOfQuestions}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  numberOfQuestions: parseInt(e.target.value) 
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
              </select>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 font-semibold rounded-lg transition-all duration-300 ${
            loading
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generating Questions...</span>
            </div>
          ) : (
            `Start ${mode.charAt(0).toUpperCase() + mode.slice(1)} Session`
          )}
        </button>
        
        {hasAttemptedSubmit && !isFormValid && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 font-medium mb-1">Please complete the following:</p>
            <ul className="text-sm text-red-600 space-y-1">
              {!config.role.trim() && <li>• Enter a target role</li>}
              {!config.company.trim() && <li>• Enter a target company</li>}
              {config.skills.length === 0 && <li>• Add at least one skill</li>}
              {config.questionTypes.length === 0 && <li>• Select at least one question type</li>}
            </ul>
          </div>
        )}
      </form>
    </motion.div>
  );
};