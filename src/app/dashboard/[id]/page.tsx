import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPresentation, getUserPresentations } from '@/lib/supabase/presentations';
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

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in');
  }

  // Await params (Next.js 15+)
  const { id } = await params;

  // Fetch the presentation
  const presentation = await getPresentation(id, user.id);

  if (!presentation) {
    // Presentation not found or doesn't belong to user
    redirect('/dashboard');
  }

  // Fetch all user presentations for sidebar
  const presentations = await getUserPresentations(user.id);

  const sidebarUser = {
    name: user.user_metadata?.name || user.email || 'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url,
  };

  return (
    <SidebarProvider>
      <AppSidebar user={sidebarUser} presentations={presentations} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbPage className="text-foreground font-medium">
                    {presentation.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <PresentationViewer presentation={presentation} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
