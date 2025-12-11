import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/usePermissions';
import { PERMISSIONS } from '@/components/permissions';
import { Users, FileText, Map, Settings, DollarSign, StickyNote, Edit, Save, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AssociationBookTab({ associationId }) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    contacts: '',
    documents: '',
    maps: '',
    operations: '',
    financial: '',
    notes: ''
  });

  const { data: associationBook, isLoading } = useQuery({
    queryKey: ['associationBook', associationId],
    queryFn: async () => {
      const books = await base44.entities.AssociationBook.filter({ association_id: associationId });
      return books[0] || null;
    },
    enabled: !!associationId
  });

  useEffect(() => {
    if (associationBook) {
      setFormData({
        contacts: associationBook.contacts || '',
        documents: associationBook.documents || '',
        maps: associationBook.maps || '',
        operations: associationBook.operations || '',
        financial: associationBook.financial || '',
        notes: associationBook.notes || ''
      });
    }
  }, [associationBook]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AssociationBook.create({
      association_id: associationId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associationBook', associationId] });
      setEditMode(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.AssociationBook.update(associationBook.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associationBook', associationId] });
      setEditMode(false);
    }
  });

  const handleSave = () => {
    if (associationBook) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    if (associationBook) {
      setFormData({
        contacts: associationBook.contacts || '',
        documents: associationBook.documents || '',
        maps: associationBook.maps || '',
        operations: associationBook.operations || '',
        financial: associationBook.financial || '',
        notes: associationBook.notes || ''
      });
    } else {
      setFormData({
        contacts: '',
        documents: '',
        maps: '',
        operations: '',
        financial: '',
        notes: ''
      });
    }
    setEditMode(false);
  };

  const canEdit = hasPermission(PERMISSIONS.ASSOCIATION_BOOK_EDIT);

  const sections = [
    { 
      key: 'contacts', 
      label: 'Contacts', 
      icon: Users,
      description: 'Key contacts and their information'
    },
    { 
      key: 'documents', 
      label: 'Documents', 
      icon: FileText,
      description: 'Important documents and links'
    },
    { 
      key: 'maps', 
      label: 'Maps', 
      icon: Map,
      description: 'Property maps and layouts'
    },
    { 
      key: 'operations', 
      label: 'Operations', 
      icon: Settings,
      description: 'Operational procedures and guidelines'
    },
    { 
      key: 'financial', 
      label: 'Financial', 
      icon: DollarSign,
      description: 'Financial information and notes'
    },
    { 
      key: 'notes', 
      label: 'Notes', 
      icon: StickyNote,
      description: 'General notes and information'
    }
  ];

  if (isLoading) {
    return <div className="text-center py-12 text-[#5c5f7a]">Loading association book...</div>;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        {canEdit && (
          <div className="flex justify-end mb-6">
            {editMode ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-[#414257] hover:bg-[#5c5f7a]"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setEditMode(true)}
                className="bg-[#414257] hover:bg-[#5c5f7a]"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        )}

        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <TabsTrigger key={section.key} value={section.key} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{section.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {sections.map(section => (
            <TabsContent key={section.key} value={section.key} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[#414257] mb-1">{section.label}</h3>
                <p className="text-sm text-[#5c5f7a] mb-4">{section.description}</p>
              </div>
              
              {editMode ? (
                <Textarea
                  value={formData[section.key]}
                  onChange={(e) => setFormData({ ...formData, [section.key]: e.target.value })}
                  placeholder={`Enter ${section.label.toLowerCase()} information...`}
                  rows={12}
                  className="font-mono text-sm"
                />
              ) : (
                <div className="min-h-[300px] p-4 bg-[#f8f8fb] rounded-lg border border-[#e3e4ed]">
                  {formData[section.key] ? (
                    <pre className="whitespace-pre-wrap text-sm text-[#414257] font-sans">
                      {formData[section.key]}
                    </pre>
                  ) : (
                    <p className="text-[#5c5f7a] italic">No {section.label.toLowerCase()} information added yet.</p>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}