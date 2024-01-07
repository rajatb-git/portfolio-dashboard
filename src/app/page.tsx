import * as React from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';

import MediaCard from '@/components/MediaCard';

export default function HomePage() {
  return (
    <Box sx={{ display: 'flex' }}>
      <div>
        <Grid container rowSpacing={3} columnSpacing={3}>
          <Grid xs={6}>
            <MediaCard
              heading="CMYK"
              text="The CMYK color model (also known as process color, or four color) is a subtractive color model, based on the CMY color model, used in color printing, and is also used to describe the printing process itself."
            />
          </Grid>
        </Grid>
      </div>
    </Box>
  );
}
