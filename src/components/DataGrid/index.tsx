import * as React from 'react';

import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { Card, IconButton } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import {
  GridRowsProp,
  GridRowModesModel,
  GridRowModes,
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridActionsCellItem,
  GridEventListener,
  GridRowId,
  GridRowModel,
  GridRowEditStopReasons,
  GridSlotProps,
} from '@mui/x-data-grid';

import { toast } from 'react-toastify';

import { Iconify } from '../Iconify';

declare module '@mui/x-data-grid' {
  interface ToolbarPropsOverrides {
    setRows: (newRows: (oldRows: GridRowsProp) => GridRowsProp) => void;
    setRowModesModel: (newModel: (oldModel: GridRowModesModel) => GridRowModesModel) => void;
    refreshData: () => void;
  }
}

function EditToolbar(props: GridSlotProps['toolbar']) {
  const { setRows, setRowModesModel, refreshData } = props;

  const handleAddRow = () => {
    setRows((oldRows) => [...oldRows, { id: 'temp', name: '', isNew: true }]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      temp: { mode: GridRowModes.Edit, fieldToFocus: 'name' },
    }));
  };

  return (
    <GridToolbarContainer>
      <Button color="primary" startIcon={<AddIcon />} onClick={handleAddRow}>
        Add record
      </Button>

      <Box sx={{ flexGrow: 1 }} />

      <IconButton onClick={refreshData}>
        <Iconify icon="fa:refresh" />
      </IconButton>
    </GridToolbarContainer>
  );
}

export default function GenericGrid(props: {
  initialRows: Array<any>;
  deleteRecord: any;
  insertOrUpdateRecord: any;
  loadData: any;
  activeCollection: 'user' | 'transactions' | 'holdings';
  dynamicColumns: Array<GridColDef>;
  refreshPage: any;
}) {
  const [rows, setRows] = React.useState<Array<any>>(props.initialRows);
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>({});

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (row: any) => async (): Promise<void> => {
    try {
      const deleteResult = await props.deleteRecord(row.id);

      if (deleteResult) {
        setRows(rows.filter((x) => x.id !== row.id));
      }

      toast.success('Record deleted successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteTempRecord = () => {
    setRows(rows.filter((x) => x.id !== 'temp'));
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });

    const editedRow = rows.find((row) => row.id === id);
    if (editedRow!.isNew) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const processRowUpdate = async (newRow: GridRowModel) => {
    const updatedRow = { ...newRow, isNew: false };
    setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));

    const temp = { ...rowModesModel };
    setRowModesModel(temp);

    try {
      if (Object.hasOwn(newRow, 'isNew')) {
        delete newRow.isNew;
        deleteTempRecord();
      }
      await props.insertOrUpdateRecord(newRow);
    } catch (err: any) {
      toast.error(`${err.name} \n ${err.message}`);
    }

    return updatedRow;
  };

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const columns: GridColDef[] = [
    ...props.dynamicColumns,
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      align: 'right',
      headerAlign: 'right',
      cellClassName: 'actions',
      flex: 1,
      getActions: (row) => {
        const isInEditMode = rowModesModel[row.id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              key={row.id}
              sx={{
                color: 'primary.main',
              }}
              onClick={handleSaveClick(row.id)}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              key={row.id}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(row.id)}
              color="inherit"
            />,
          ];
        }

        return [
          <GridActionsCellItem
            key={row.id}
            icon={<EditIcon />}
            label="Edit"
            className="textPrimary"
            onClick={handleEditClick(row.id)}
            color="inherit"
          />,
          <GridActionsCellItem
            key={row.id}
            icon={<DeleteIcon />}
            label="Delete"
            onClick={handleDeleteClick(row)}
            color="inherit"
          />,
        ];
      },
    },
  ];

  return (
    <Box
      sx={{
        height: 500,
        width: '100%',
        '& .actions': {
          color: 'text.secondary',
        },
        '& .textPrimary': {
          color: 'text.primary',
        },
      }}
    >
      <Card variant="outlined" sx={{ background: 'transparent' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          editMode="row"
          rowModesModel={rowModesModel}
          onRowModesModelChange={handleRowModesModelChange}
          onRowEditStop={handleRowEditStop}
          processRowUpdate={processRowUpdate}
          slots={{
            toolbar: EditToolbar,
          }}
          slotProps={{
            toolbar: { setRows, setRowModesModel, refreshData: props.loadData },
          }}
        />
      </Card>
    </Box>
  );
}
