import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Construction, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PlaceholderPage({ 
  title, 
  description = "This tool is currently under development and will be available soon.",
  icon: Icon = Construction 
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-0 shadow-lg overflow-hidden bg-white">
        <div className="h-2 bg-gradient-to-r from-[#414257] via-[#5c5f7a] to-[#414257]" />
        
        <CardContent className="p-8 lg:p-12 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#e3e4ed] mb-8">
            <Icon className="w-10 h-10 text-[#414257]" />
          </div>

          {/* Content */}
          <div className="space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Coming Soon</span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-bold text-[#414257]">
              {title}
            </h1>
            
            <p className="text-[#5c5f7a] leading-relaxed max-w-md mx-auto">
              {description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={createPageUrl('Dashboard')}>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto border-[#e3e4ed] text-[#414257] hover:bg-[#e3e4ed]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Decorative elements */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-sm text-[#5c5f7a]">
              Have questions? Contact the development team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}