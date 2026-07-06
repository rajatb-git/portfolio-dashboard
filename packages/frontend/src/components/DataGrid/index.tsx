import * as React from 'react';

import AddIcon from '@mui/icons-material/Add';
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
    readOnly: boolean;
  }
}

function EditToolbar(props: GridSlotProps['toolbar']) {
  const { setRows, setRowModesModel, refreshData, readOnly } = props;

  const handleAddRow = () => {
    setRows((oldRows) => [...oldRows, { id: 'temp', name: '', isNew: true }]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      temp: { mode: GridRowModes.Edit, fieldToFocus: 'name' },
    }));
  };

  return (
    <GridToolbarContainer>
      {!readOnly && (
        <Button color="primary" startIcon={<AddIcon />} onClick={handleAddRow}>
          Add record
        </Button>
      )}

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
  activeCollection: string;
  dynamicColumns: Array<GridColDef>;
  refreshPage: any;
  readOnly?: boolean;
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

    await props.refreshPage();

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
      width: 100,
      getActions: (row) => {
        const isInEditMode = rowModesModel[row.id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem icon={<SaveIcon />} label="Save" key={row.id} onClick={handleSaveClick(row.id)} />,
            <GridActionsCellItem
              icon={<Iconify icon="fa:close" />}
              key={row.id}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(row.id)}
              color="inherit"
            />,
          ];
        }

        return [
          ...(props.readOnly
            ? []
            : [
                <GridActionsCellItem
                  key={row.id}
                  icon={<EditIcon />}
                  label="Edit"
                  className="textPrimary"
                  onClick={handleEditClick(row.id)}
                  color="inherit"
                />,
              ]),
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
      <Card variant="outlined" sx={{ background: 'transparent', height: '80vh' }}>
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
            toolbar: {
              setRows: setRows as any,
              setRowModesModel,
              refreshData: props.loadData,
              readOnly: !!props.readOnly,
            },
          }}
        />
      </Card>
    </Box>
  );
}
