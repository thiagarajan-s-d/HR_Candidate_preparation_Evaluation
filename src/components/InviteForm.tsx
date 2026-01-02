import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Copy, Check, Mail, User, Building, Clock, Calendar } from 'lucide-react';
import { User as UserType, InvitationConfig, QuestionType, QuestionTypeOption } from '../types';
import { Plus, X, Code, Brain, Users, Wrench, Bug, Lightbulb, FileText } from 'lucide-react';

interface InviteFormProps {
  requestor: UserType;
  onInvitationSent: () => void;
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

export const InviteForm: React.FC<InviteFormProps> = ({ requestor, onInvitationSent, loading }) => {
  const [formData, setFormData] = useState({
    candidateEmail: 'candidate@example.com',
    candidateName: 'John Doe',
    role: 'Senior Software Engineer',
    company: 'Microsoft',
    skills: ['React', 'TypeScript', 'System Design'] as string[],
    proficiencyLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert',
    numberOfQuestions: 25,
    questionTypes: ['technical-coding', 'technical-concepts'] as QuestionType[],
    expiryDays: 7,
    customMessage: 'Good luck with your technical assessment!'
  });
  
  const [skillInput, setSkillInput] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const toggleQuestionType = (type: QuestionType) => {
    setFormData(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  const isFormValid = formData.candidateEmail.trim() !== '' && 
                     formData.role.trim() !== '' && 
                     formData.company.trim() !== '' && 
                     formData.skills.length > 0 && 
                     formData.questionTypes.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    
    if (!isFormValid) return;

    const invitation: InvitationConfig = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      requestorId: requestor.id,
      requestorName: requestor.name || requestor.email,
      requestorEmail: requestor.email,
      candidateEmail: formData.candidateEmail,
      candidateName: formData.candidateName,
      role: formData.role,
      company: formData.company,
      skills: formData.skills,
      proficiencyLevel: formData.proficiencyLevel,
      numberOfQuestions: formData.numberOfQuestions,
      questionTypes: formData.questionTypes,
      expiresAt: new Date(Date.now() + formData.expiryDays * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      customMessage: formData.customMessage
    };

    // Save invitation to database
    try {
      console.log('Saving invitation to database:', invitation.id);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      console.log('API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation })
      });
      
      console.log('Save response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save error response:', errorText);
        throw new Error(`Failed to save invitation: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Invitation saved successfully:', result);
    } catch (error) {
      console.error('Error saving invitation to database:', error);
      console.log('Falling back to localStorage storage');
      
      // Fallback to localStorage if database fails
      try {
        const existingInvitations = JSON.parse(localStorage.getItem('interview_invitations') || '[]');
        existingInvitations.push(invitation);
        localStorage.setItem('interview_invitations', JSON.stringify(existingInvitations));
        console.log('Invitation saved to localStorage as fallback');
      } catch (localError) {
        console.error('Failed to save to localStorage:', localError);
        alert('Failed to save invitation. Please try again.');
        return;
      }
    }

    // Generate invitation link
    const baseUrl = window.location.origin;
    const inviteLink = `${baseUrl}?invite=${invitation.id}`;
    setGeneratedLink(inviteLink);

    // Simulate sending email (in production, this would call an email service)
    console.log('Invitation created:', invitation);
    console.log('Invitation link:', inviteLink);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const sendAnotherInvite = () => {
    setFormData({
      candidateEmail: '',
      candidateName: '',
      role: '',
      company: '',
      skills: [],
      proficiencyLevel: 'intermediate',
      numberOfQuestions: 25,
      questionTypes: ['technical-coding', 'technical-concepts'],
      expiryDays: 7,
      customMessage: ''
    });
    setSkillInput('');
    setGeneratedLink('');
    setLinkCopied(false);
    setHasAttemptedSubmit(false);
  };

  if (generatedLink) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Invitation Created Successfully!</h2>
          <p className="text-gray-600 mt-2">
            The evaluation link has been generated for {formData.candidateEmail}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Invitation Details:</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Candidate:</strong> {formData.candidateName || formData.candidateEmail}</p>
            <p><strong>Role:</strong> {formData.role} at {formData.company}</p>
            <p><strong>Questions:</strong> {formData.numberOfQuestions} questions</p>
            <p><strong>Expires:</strong> {new Date(Date.now() + formData.expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Invitation Link
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm"
            />
            <button
              onClick={copyLink}
              className={`px-4 py-2 rounded-lg transition-colors ${
                linkCopied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Share this link with the candidate to start their evaluation
          </p>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-amber-900 mb-2">Next Steps:</h3>
          <ol className="text-sm text-amber-800 space-y-1">
            <li>1. Copy the invitation link above</li>
            <li>2. Send it to the candidate via email or your preferred method</li>
            <li>3. The candidate will complete the evaluation using this link</li>
            <li>4. Results will be automatically saved and can be viewed in your dashboard</li>
          </ol>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={sendAnotherInvite}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Send Another Invitation
          </button>
          <button
            onClick={onInvitationSent}
            className="flex-1 px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="h-8 w-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Create Evaluation Invitation</h2>
        <p className="text-gray-600 mt-2">
          Set up a custom assessment and send an invitation link to your candidate
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidate Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Candidate Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Email *
              </label>
              <input
                type="email"
                value={formData.candidateEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, candidateEmail: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="candidate@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Name (Optional)
              </label>
              <input
                type="text"
                value={formData.candidateName}
                onChange={(e) => setFormData(prev => ({ ...prev, candidateName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
          </div>
        </div>

        {/* Position Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Position Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Senior Software Engineer"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company *
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Google, Microsoft, Amazon"
                required
              />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Required Skills & Technologies *
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            {formData.skills.map((skill) => (
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
          {hasAttemptedSubmit && formData.skills.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              Add at least one skill to continue
            </p>
          )}
        </div>

        {/* Question Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Question Types * <span className="text-gray-500">(Select at least one)</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
            {questionTypeOptions.map((option) => {
              const Icon = getIcon(option.icon);
              const isSelected = formData.questionTypes.includes(option.id);
              
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
          {hasAttemptedSubmit && formData.questionTypes.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              Please select at least one question type
            </p>
          )}
        </div>

        {/* Assessment Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proficiency Level
            </label>
            <select
              value={formData.proficiencyLevel}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                proficiencyLevel: e.target.value as any 
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions
            </label>
            <select
              value={formData.numberOfQuestions}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                numberOfQuestions: parseInt(e.target.value) 
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>15 Questions</option>
              <option value={20}>20 Questions</option>
              <option value={25}>25 Questions</option>
              <option value={30}>30 Questions</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Link Expires In
            </label>
            <select
              value={formData.expiryDays}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                expiryDays: parseInt(e.target.value) 
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>1 Day</option>
              <option value={3}>3 Days</option>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>
        </div>

        {/* Custom Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Message (Optional)
          </label>
          <textarea
            value={formData.customMessage}
            onChange={(e) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="Add a personal message for the candidate..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 font-semibold rounded-lg transition-all duration-300 ${
            loading
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Creating Invitation...</span>
            </div>
          ) : (
            'Create Invitation Link'
          )}
        </button>
        
        {hasAttemptedSubmit && !isFormValid && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 font-medium mb-1">Please complete the following:</p>
            <ul className="text-sm text-red-600 space-y-1">
              {!formData.candidateEmail.trim() && <li>• Enter candidate email</li>}
              {!formData.role.trim() && <li>• Enter target role</li>}
              {!formData.company.trim() && <li>• Enter target company</li>}
              {formData.skills.length === 0 && <li>• Add at least one skill</li>}
              {formData.questionTypes.length === 0 && <li>• Select at least one question type</li>}
            </ul>
          </div>
        )}
      </form>
    </motion.div>
  );
};