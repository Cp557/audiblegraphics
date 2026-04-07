import { redirect } from 'next/navigation';
import { getPresentation, getPresentations } from '@/lib/local/presentations';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { PresentationViewer } from '@/components/PresentationViewer';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { DownloadVideoButton } from '@/components/DownloadVideoButton';

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [presentation, presentations] = await Promise.all([
    getPresentation(id),
    getPresentations(),
  ]);

  if (!presentation) {
    redirect('/');
  }

  return (
    <SidebarProvider>
      <AppSidebar presentations={presentations} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground font-medium">
                    {presentation.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <DownloadVideoButton presentationId={presentation.id} title={presentation.title} />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <PresentationViewer presentation={presentation} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
