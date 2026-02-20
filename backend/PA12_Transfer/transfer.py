# --------------------------------------------------------------------------------------
# Functions to transfer data or objects between Planning Analytics environments
#
# (C) 2023 Janus Timperi, Helsinki, Finland
# janus.timperi@intito.fi
# --------------------------------------------------------------------------------------

import os
import datetime
from TM1py.Services import TM1Service  # type: ignore
from TM1py.Objects import TM1Object  # type: ignore
from TM1py.Exceptions.Exceptions import TM1pyRestException
from mdxpy import MdxBuilder, MdxHierarchySet, Member, ElementType  # type: ignore
import sys
import itertools
import logging_config
import logging


logger = logging.getLogger(__name__)


def transfer_process(tm1_source: TM1Object.TM1Object, tm1_target: TM1Object.TM1Object,
                     process_name: str):
    """ Retrieve specific process from source and update or create it into target. """
    logger.info(f'Update process: {process_name}')
    # Get process
    process = tm1_source.processes.get(name_process=process_name)

    # Update process
    tm1_target.processes.update_or_create(process=process)


def transfer_dimension(tm1_source: TM1Object.TM1Object, tm1_target: TM1Object.TM1Object,
                       dimension_name: str, include_subsets: bool):
    """ Retrieve specific dimension from source and update or create it into target. """
    logger.info(f'Transfer dimension: {dimension_name}')

    # Skip in v12 transfer
    if dimension_name in ['}Clients',
                          '}ApplicationEntries',
                          '}CAMAssociatedGroups',
                          '}CubeProperties']:
        return
    # Skip element attributes (updated already in dimension transfer)
    if dimension_name[:19] == '}ElementAttributes_':
        return
    # Skip hierarchies (updated already in dimension transfer)
    if dimension_name[:13] == '}Hierarchies_':
        return
    # Skip subsets (updated already in dimension transfer)
    if dimension_name[:9] == '}Subsets_':
        return
    # Skip views (updated already in cube transfer)
    if dimension_name[:7] == '}Views_':
        return
    # Skip OC
    if dimension_name[:3] == '}OC':
        return
    # if dimension_name[0] != '}':
    #     return

    # Get dimension
    dimension = tm1_source.dimensions.get(dimension_name=dimension_name)

    # Update dimension
    tm1_target.dimensions.update_or_create(dimension=dimension)

    # Update attributes
    cube_name = '}ElementAttributes_' + dimension_name
    if tm1_source.cubes.exists(cube_name=cube_name):
        logger.info(f'Update attributes for dimension: {dimension_name}')
        transfer_cube_leaves_data(tm1_source=tm1_source, tm1_target=tm1_target,
                                  cube_name=cube_name, filter={})

        # Update hierarchy consolidation attributes
        hierarchies = tm1_source.hierarchies.get_all_names(
            dimension_name=dimension_name)
        for hier in hierarchies:
            if hier not in ['Leaves', dimension_name]:
                transfer_hierarchy_attribute_data(tm1_source=tm1_source,
                                                  tm1_target=tm1_target,
                                                  dim_name=dimension_name,
                                                  hier_name=hier,
                                                  cube_name=cube_name)

    if include_subsets:
        logger.info('Update subsets')
        hierarchy_list = tm1_source.hierarchies.get_all_names(
            dimension_name=dimension_name)
        for hier in hierarchy_list:
            subset_list = tm1_source.subsets.get_all_names(
                dimension_name=dimension_name,
                hierarchy_name=hier)
            for subset_name in subset_list:
                subset = tm1_source.subsets.get(subset_name=subset_name,
                                                dimension_name=dimension_name,
                                                hierarchy_name=hier)
                tm1_target.subsets.update_or_create(subset=subset)


def transfer_cube(tm1_source: TM1Object.TM1Object, tm1_target: TM1Object.TM1Object,
                  cube_name: str, include_views: bool, include_data: bool):
    """ Retrieve specific cube from source and update or create it into target. """
    logger.info(f'Update cube: {cube_name}')

    # Skip in v12 transfer
    if cube_name in ['}ClientCAMAssociatedGroups',
                     '}CubeProperties',
                     '}ClientGroups',
                     '}ClientProperties']:
        return
    # Skip element attributes (updated already in dimension transfer)
    if cube_name[:19] == '}ElementAttributes_':
        return
    # Skip OC
    if cube_name[:3] == '}OC':
        return
    if cube_name[:20] == '}ElementSecurity_}OC':
        return

    # Get cube
    cube = tm1_source.cubes.get(cube_name=cube_name)

    # Update cube
    tm1_target.cubes.update_or_create(cube=cube)

    if include_views:
        logger.info('Update views')
        view_lists = tm1_source.views.get_all_names(cube_name=cube_name)
        # Public views only
        for view_name in view_lists[1]:
            if view_name[:6] == 'TempI_':
                continue
            view = tm1_source.views.get(cube_name=cube_name,
                                        view_name=view_name)
            tm1_target.views.update_or_create(view=view)

    if include_data:
        transfer_cube_leaves_data(tm1_source=tm1_source, tm1_target=tm1_target,
                                  cube_name=cube_name, filter={})
        transfer_cube_consolidation_data(tm1_source=tm1_source, tm1_target=tm1_target,
                                         cube_name=cube_name, filter={})


def transfer_hierarchy_attribute_data(tm1_source: TM1Object.TM1Object,
                                      tm1_target: TM1Object.TM1Object,
                                      dim_name: str, hier_name: str, cube_name: str):
    """Retrieve consolidation data for hierarchy and transfer it"""
    cube_name = cube_name
    dimensions = tm1_source.cubes.get_dimension_names(cube_name=cube_name)

    measure_dim = dimensions[-1]

    mdx_builder = MdxBuilder.from_cube(cube_name)
    for dim in dimensions:
        if dim == dim_name:
            mdx_builder.add_hierarchy_set_to_column_axis(
                MdxHierarchySet.except_(
                    MdxHierarchySet.all_members(dim, hier_name),
                    MdxHierarchySet.filter_by_level(
                            MdxHierarchySet.all_members(dim, hier_name),
                            0)
                )
            )
        elif dim == measure_dim:
            mdx_builder.add_hierarchy_set_to_column_axis(
                MdxHierarchySet.all_members(dim, dim),
            )
        else:
            mdx_builder.add_hierarchy_set_to_column_axis(
                MdxHierarchySet.except_(
                    MdxHierarchySet.all_members(dim, dim),
                    MdxHierarchySet.filter_by_level(
                            MdxHierarchySet.all_members(dim, dim),
                            0)
                )
            )

        mdx_builder.columns_non_empty()
        mdx = mdx_builder.to_mdx()

        data = {}
        try:
            data = tm1_source.cells.execute_mdx(mdx=mdx, skip_cell_properties=True,
                                                element_unique_names=False)
        except TM1pyRestException as e:
            print(f"TM1 error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

        # Write values to target
        if len(data) != 0:
            data_hier = {}
            # Add hierarchy prefix to tuple value
            for key, value in data.items():
                key_list = list(key)
                key_list[0] = hier_name + ':' + key[0]
                key = tuple(key_list)
                data_hier[key] = value
            tm1_target.cells.write(cube_name=cube_name, cellset_as_dict=data_hier,
                                   dimensions=dimensions, use_blob=True,
                                   skip_non_updateable=True)


def transfer_cube_leaves_data(tm1_source: TM1Object.TM1Object,
                              tm1_target: TM1Object.TM1Object,
                              cube_name: str, filter: dict):
    """Retrieve specific cube data from source and update or create it into target.
    filter is dict of lists, key is dimension and dict is list of elements
    """
    logger.info(f'Transfer cube data: {cube_name}')
    # Get cube dimensions
    dimensions = tm1_source.cubes.get_dimension_names(cube_name=cube_name)

    # Split into time slices
    element_list = []
    time_dim = ''
    # if 'Month' in dimensions:
    #     time_dim = 'Month'
    #     element_list = tm1_source.elements.get_leaf_element_names(
    #         dimension_name='Month',
    #         hierarchy_name='Month')
    # elif 'Year' in dimensions:
    #     time_dim = 'Year'
    #     element_list = tm1_source.elements.get_leaf_element_names(
    #         dimension_name='Year',
    #         hierarchy_name='Year')
    # elif 'Day' in dimensions:
    #     time_dim = 'Day'
    #     element_list = tm1_source.elements.get_leaf_element_names(
    #         dimension_name='Day',
    #         hierarchy_name='Day')

    # Transfer numeric data (leafs only)
    # Case where transfer split into slices with time dimension
    if len(element_list) > 0:
        for element in element_list:
            logger.info(f'Transfer cube {cube_name} slice: {element}')
            # Get cube data
            mdx_builder = MdxBuilder.from_cube(cube_name)
            for dim in dimensions:
                if dim in filter:
                    for elem in filter[dim]:
                        mdx_builder.add_hierarchy_set_to_column_axis(
                            MdxHierarchySet.filter_by_level(
                                MdxHierarchySet.tm1_drill_down_member(
                                    MdxHierarchySet.members([Member.of(dim, elem)]),
                                    recursive=True),
                                0)
                            )
                elif dim == time_dim:
                    mdx_builder.add_hierarchy_set_to_column_axis(
                        MdxHierarchySet.members([Member.of(dim, element)]))
                else:
                    mdx_builder.add_hierarchy_set_to_column_axis(
                        MdxHierarchySet.all_leaves(dim))

            mdx_builder.columns_non_empty()
            mdx = mdx_builder.to_mdx()

            data = []
            try:
                data = tm1_source.cells.execute_mdx(mdx=mdx, skip_cell_properties=True,
                                                    element_unique_names=False)
            except TM1pyRestException as e:
                print(f"TM1 error: {e}")
            except Exception as e:
                print(f"Unexpected error: {e}")

            # Write values to target
            if len(data) != 0:
                tm1_target.cells.write(cube_name=cube_name, cellset_as_dict=data,
                                       dimensions=dimensions, use_blob=True,
                                       skip_non_updateable=True)
    # Case where all leaves transferred at once
    else:
        # Get cube data
        mdx_builder = MdxBuilder.from_cube(cube_name)
        for dim in dimensions:
            if dim in filter:
                for elem in filter[dim]:
                    mdx_builder.add_hierarchy_set_to_column_axis(
                        MdxHierarchySet.filter_by_level(
                            MdxHierarchySet.tm1_drill_down_member(
                                MdxHierarchySet.members([Member.of(dim, elem)]),
                                recursive=True),
                            0)
                        )
            else:
                mdx_builder.add_hierarchy_set_to_column_axis(
                    MdxHierarchySet.all_leaves(dim))

        mdx_builder.columns_non_empty()
        mdx = mdx_builder.to_mdx()

        data = {}
        try:
            data = tm1_source.cells.execute_mdx(mdx=mdx, skip_cell_properties=True,
                                                element_unique_names=False)
        except TM1pyRestException as e:
            print(f"TM1 error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

        # Write values to target
        if len(data) != 0:
            tm1_target.cells.write(cube_name=cube_name, cellset_as_dict=data,
                                   dimensions=dimensions, use_blob=True,
                                   skip_non_updateable=True)


def transfer_cube_consolidation_data(tm1_source: TM1Object.TM1Object,
                                     tm1_target: TM1Object.TM1Object,
                                     cube_name: str, filter: dict):
    """Retrieve specific cube consolidation data for all hierarchies from source and
    transfer it into target.
    filter is dict of lists, key is dimension and dict is list of elements
    """
    logger.info(f'Transfer cube {cube_name} consolidation data')
    # Get cube dimensions
    dimensions = tm1_source.cubes.get_dimension_names(cube_name=cube_name)

    # Loop through dimensions to get full hierarchy list
    dim_hierarchies = {}
    for dim in dimensions:
        hierarchies = tm1_source.hierarchies.get_all_names(
            dimension_name=dim)
        hierarchy_list = []
        for hier in hierarchies:
            if hier not in ['Leaves']:
                hierarchy_list.append(hier)
        dim_hierarchies[dim] = hierarchy_list

    measure_dim = dimensions[-1]

    # Create all combinations of dimension hierarchies
    combinations = list(itertools.product(*dim_hierarchies.values()))
    for combination in combinations:
        mdx_builder = MdxBuilder.from_cube(cube_name)
        for dimension, hierarchy in zip(dim_hierarchies.keys(), combination):
            # Build hierarchy MDX
            dim_hier = dimension + ':' + hierarchy
            if dim_hier in filter:
                for elem in filter[dim_hier]:
                    mdx_builder.add_hierarchy_set_to_column_axis(
                        MdxHierarchySet.tm1_drill_down_member(
                            MdxHierarchySet.members([Member(dimension=dimension,
                                                            hierarchy=hierarchy,
                                                            element=elem)]),
                            recursive=True)
                    )
            elif dimension == measure_dim:
                mdx_builder.add_hierarchy_set_to_column_axis(
                    MdxHierarchySet.except_(
                        MdxHierarchySet.all_members(dimension, hierarchy),
                        MdxHierarchySet.filter_by_element_type(
                            MdxHierarchySet.all_members(dimension, hierarchy),
                            ElementType(1))
                    )
                )
            else:
                mdx_builder.add_hierarchy_set_to_column_axis(
                    MdxHierarchySet.all_members(dimension, hierarchy)
                )
        mdx_builder.columns_non_empty()
        mdx = mdx_builder.to_mdx()

        data = {}
        try:
            data = tm1_source.cells.execute_mdx(mdx=mdx, skip_cell_properties=True,
                                                element_unique_names=False)
        except TM1pyRestException as e:
            print(f"TM1 error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

        # Write values to target
        if len(data) != 0:
            data_final = {}
            # Check if any hierarchies in use
            check = False
            for dimension, hierarchy in zip(dim_hierarchies.keys(), combination):
                if dimension != hierarchy:
                    check = True
            # Add hierarchy prefix to tuple values
            if check:
                for key, value in data.items():
                    for idx, (dimension, hierarchy) in enumerate(zip(
                            dim_hierarchies.keys(),
                            combination)):
                        key_list = list(key)
                        if dimension != hierarchy:
                            key_list[idx] = hierarchy + ':' + key[idx]
                        key = tuple(key_list)
                    data_final[key] = value
            else:
                data_final = data
            tm1_target.cells.write(cube_name=cube_name, cellset_as_dict=data_final,
                                dimensions=dimensions, use_blob=True,
                                skip_non_updateable=True)