import { useState, useEffect } from 'react';
import { Building2, Users, Settings, Plus, Mail, Crown, Shield, Eye, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  industry?: string;
  tier: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  member_count: number;
  workshop_count: number;
}

interface Member {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role: string;
  title?: string;
  department?: string;
  is_active: boolean;
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  invited_by_name: string;
  created_at: string;
  expires_at: string;
}

import { API_BASE_URL } from '../../lib/config';

const API_BASE = API_BASE_URL;

export function OrganizationManager() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'settings'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newOrg, setNewOrg] = useState({ name: '', description: '', industry: '' });
  const [newInvite, setNewInvite] = useState({ email: '', role: 'MEMBER' });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchMembers(selectedOrg.id);
      fetchInvitations(selectedOrg.id);
    }
  }, [selectedOrg]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations);
        if (data.organizations.length > 0 && !selectedOrg) {
          setSelectedOrg(data.organizations[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (orgId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/members`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchInvitations = async (orgId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${orgId}/invitations`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const createOrganization = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newOrg)
      });
      if (res.ok) {
        const org = await res.json();
        setOrganizations([...organizations, org]);
        setSelectedOrg(org);
        setShowCreateModal(false);
        setNewOrg({ name: '', description: '', industry: '' });
        toast.success('Organization created successfully');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to create organization');
      }
    } catch (error) {
      toast.error('Failed to create organization');
    }
  };

  const inviteMember = async () => {
    if (!selectedOrg) return;
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${selectedOrg.id}/invitations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newInvite)
      });
      if (res.ok) {
        const invitation = await res.json();
        setInvitations([...invitations, invitation]);
        setShowInviteModal(false);
        setNewInvite({ email: '', role: 'MEMBER' });
        toast.success('Invitation sent');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to send invitation');
      }
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedOrg || !confirm('Remove this member?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${selectedOrg.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setMembers(members.filter(m => m.id !== memberId));
        toast.success('Member removed');
      }
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    if (!selectedOrg) return;
    try {
      const res = await fetch(`${API_BASE}/api/organizations/${selectedOrg.id}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setInvitations(invitations.filter(i => i.id !== invitationId));
        toast.success('Invitation revoked');
      }
    } catch (error) {
      toast.error('Failed to revoke invitation');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'ADMIN': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'VIEWER': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <Users className="w-4 h-4 text-green-500" />;
    }
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      'FREE': 'bg-gray-100 text-gray-700',
      'STARTER': 'bg-blue-100 text-blue-700',
      'PROFESSIONAL': 'bg-purple-100 text-purple-700',
      'ENTERPRISE': 'bg-yellow-100 text-yellow-700'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[tier] || colors['FREE']}`}>
        {tier}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organizations</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your organizations and team members</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Organization
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Organization Sidebar */}
        <div className="col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Your Organizations</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {organizations.map(org => (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedOrg?.id === org.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: org.primary_color }}
                    >
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{org.name}</p>
                      <p className="text-sm text-gray-500">{org.member_count} members</p>
                    </div>
                  </div>
                </button>
              ))}
              {organizations.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No organizations yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          {selectedOrg ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                      style={{ backgroundColor: selectedOrg.primary_color }}
                    >
                      {selectedOrg.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedOrg.name}</h2>
                        {getTierBadge(selectedOrg.tier)}
                        {selectedOrg.is_verified && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Verified</span>
                        )}
                      </div>
                      <p className="text-gray-500">{selectedOrg.description || 'No description'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-4 px-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: Building2 },
                    { id: 'members', label: 'Members', icon: Users },
                    { id: 'settings', label: 'Settings', icon: Settings }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Members</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedOrg.member_count}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Workshops</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedOrg.workshop_count}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Industry</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedOrg.industry || '-'}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'members' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-900 dark:text-white">Team Members</h3>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite Member
                      </button>
                    </div>

                    {/* Members List */}
                    <div className="space-y-2">
                      {members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 font-medium">
                                {member.user_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white">{member.user_name}</p>
                                {getRoleIcon(member.role)}
                              </div>
                              <p className="text-sm text-gray-500">{member.user_email}</p>
                            </div>
                          </div>
                          {member.role !== 'OWNER' && (
                            <button
                              onClick={() => removeMember(member.id)}
                              className="p-2 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Pending Invitations</h4>
                        <div className="space-y-2">
                          {invitations.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-yellow-600" />
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{inv.email}</p>
                                  <p className="text-sm text-gray-500">Invited as {inv.role}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => revokeInvitation(inv.id)}
                                className="text-sm text-red-600 hover:underline"
                              >
                                Revoke
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={selectedOrg.name}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg border"
                          style={{ backgroundColor: selectedOrg.primary_color }}
                        />
                        <input
                          type="text"
                          value={selectedOrg.primary_color}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Organization Selected</h3>
              <p className="text-gray-500 mb-4">Select an organization or create a new one</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Organization
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Organization</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={newOrg.name}
                  onChange={e => setNewOrg({ ...newOrg, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newOrg.description}
                  onChange={e => setNewOrg({ ...newOrg, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  rows={3}
                  placeholder="Brief description of your organization"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industry
                </label>
                <select
                  value={newOrg.industry}
                  onChange={e => setNewOrg({ ...newOrg, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">Select industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createOrganization}
                disabled={!newOrg.name}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Invite Member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newInvite.email}
                  onChange={e => setNewInvite({ ...newInvite, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="colleague@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={newInvite.role}
                  onChange={e => setNewInvite({ ...newInvite, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={inviteMember}
                disabled={!newInvite.email}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationManager;
