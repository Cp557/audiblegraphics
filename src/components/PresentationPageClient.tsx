'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { PresentationViewer } from '@/components/PresentationViewer';
import { DownloadVideoButton } from '@/components/DownloadVideoButton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import { usePresentation } from '@/hooks/use-presentations';

export function PresentationPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { presentation, isLoading } = usePresentation(params.id);

  useEffect(() => {
    if (!isLoading && !presentation) router.replace('/');
  }, [isLoading, presentation, router]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-medium">
                    {presentation?.title || 'Loading infographic'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {presentation && (
              <div className="ml-auto">
                <DownloadVideoButton presentation={presentation} />
              </div>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {presentation ? (
            <PresentationViewer presentation={presentation} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
