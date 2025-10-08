import React, { useState, useEffect } from 'react';
import { feedbackAPI } from '../utils/api';
import { 
  MessageSquare, 
  Send, 
  Star,
  Bug,
  Lightbulb,
  Settings,
  AlertCircle,
  Heart,
  CheckCircle,
  Clock,
  User,
  Calendar,
  PanelLeft
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  adminResponse?: string;
  adminName?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackPageProps {
  user?: any;
  onNavigateToDashboard: () => void;
}

const FeedbackPage: React.FC<FeedbackPageProps> = ({ user, onNavigateToDashboard }) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium'
  });
  const [submitting, setSubmitting] = useState(false);
  const [userFeedback, setUserFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
    { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-500' },
    { value: 'improvement', label: 'Improvement', icon: Settings, color: 'text-blue-500' },
    { value: 'complaint', label: 'Complaint', icon: AlertCircle, color: 'text-orange-500' },
    { value: 'compliment', label: 'Compliment', icon: Heart, color: 'text-pink-500' },
    { value: 'general', label: 'General Feedback', icon: MessageSquare, color: 'text-gray-500' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    if (activeTab === 'history') {
      fetchUserFeedback();
    }
  }, [activeTab]);

  const fetchUserFeedback = async () => {
    setLoading(true);
    try {
      const data = await feedbackAPI.getUserFeedback();
      setUserFeedback(data.feedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await feedbackAPI.submitFeedback(formData);
      
      setFormData({
        subject: '',
        message: '',
        category: 'general',
        priority: 'medium'
      });
      alert('Feedback submitted successfully! Thank you for your input.');
      // Refresh feedback history if on history tab
      if (activeTab === 'history') {
        fetchUserFeedback();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in-progress':
        return <Settings className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
      {/* Return to Dashboard Button */}
      <button
        onClick={onNavigateToDashboard}
        className="mb-4 flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors text-white"
      >
        <PanelLeft className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </button>
      {/* Header */}
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
          <MessageSquare className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">Feedback</h1>
          <p className="text-gray-300">
            Help us improve AIVA by sharing your thoughts, reporting issues, or suggesting new features.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-slate-600 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('submit')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'submit'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Submit Feedback
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          My Feedback
        </button>
      </div>

      {activeTab === 'submit' ? (
        <div className="bg-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <Send className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Submit Feedback</h2>
              <p className="text-gray-600">Share your thoughts to help us improve</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Feedback Category
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                      className={`p-3 border rounded-xl flex items-center space-x-2 transition-colors ${
                        formData.category === category.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${category.color}`} />
                      <span className="font-medium">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <div className="flex space-x-3">
                {priorities.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      formData.priority === priority.value
                        ? priority.color
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Brief summary of your feedback"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                id="message"
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Please provide detailed feedback..."
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Send className="h-5 w-5" />
                <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">My Feedback</h2>
              <p className="text-gray-600">View your submitted feedback and responses</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading your feedback</h3>
                <p className="text-gray-500">Please wait while we fetch your feedback history...</p>
              </div>
            ) : userFeedback.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No feedback yet</h3>
                <p className="text-gray-500">Switch to the Submit tab to send your first feedback.</p>
              </div>
            ) : (
              userFeedback.map((feedback) => (
                <div key={feedback.id} className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{feedback.subject}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(feedback.status)}`}>
                          {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          priorities.find(p => p.value === feedback.priority)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {feedback.priority.charAt(0).toUpperCase() + feedback.priority.slice(1)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4">{feedback.message}</p>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(feedback.createdAt)}</span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(feedback.status)}
                          <span className="capitalize">{feedback.status.replace('-', ' ')}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {feedback.adminResponse && (
                    <div className="mt-4 p-4 bg-blue-100 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">
                          Admin Response {feedback.adminName && `by ${feedback.adminName}`}
                        </span>
                        {feedback.respondedAt && (
                          <span className="text-sm text-blue-600">
                            • {formatDate(feedback.respondedAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-blue-700">{feedback.adminResponse}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default FeedbackPage;