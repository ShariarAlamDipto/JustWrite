import { GetServerSideProps } from 'next';

// Root path redirects to the Journal tab (the primary screen).
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/journal',
      permanent: false,
    },
  };
};

export default function IndexPage() {
  return null;
}
