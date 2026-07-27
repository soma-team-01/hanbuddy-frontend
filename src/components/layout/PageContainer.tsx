type PageContainerProps = React.ComponentProps<"div">;

export function PageContainer({ className, ...props }: Readonly<PageContainerProps>) {
  return (
    <div
      className={`mx-auto w-full max-w-[1200px] px-4 md:px-6 lg:px-8 ${className ?? ""}`}
      {...props}
    />
  );
}
