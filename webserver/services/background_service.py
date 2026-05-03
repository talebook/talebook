#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import logging
import threading
from typing import Dict, List, Optional


class BackgroundTask:
    """后台任务记录模型"""

    # 服务类型
    SERVICE_TYPE_AUTOFILL = "autofill"  # 图书信息刮削
    SERVICE_TYPE_SCAN = "scan"  # 批量图书导入
    SERVICE_TYPE_AUDIO = "audio"  # 音频转换
    SERVICE_TYPE_AUDIO_IMPORT = "audio_import"  # 有声书导入
    SERVICE_TYPE_CONVERT = "convert"  # 图书转换
    SERVICE_TYPE_AI_FILL = "ai_fill"  # AI 更新
    SERVICE_TYPE_TITLE_SORT_UPDATE = "title_sort_update"  # 更新拼音书名

    # 任务状态
    STATUS_RUNNING = "running"  # 运行中
    STATUS_COMPLETED = "completed"  # 已完成
    STATUS_CANCELLED = "cancelled"  # 已取消
    STATUS_FAILED = "failed"  # 失败

    _id_counter = 0
    _id_lock = threading.Lock()

    def __init__(self, service_type, service_item, book_id=0, progress=0, progress_data=None):
        with BackgroundTask._id_lock:
            BackgroundTask._id_counter += 1
            self.id = BackgroundTask._id_counter

        self.service_type = service_type
        self.service_item = service_item
        self.status = self.STATUS_RUNNING
        self.progress = progress
        self.progress_data = progress_data or {}
        self.create_time = datetime.datetime.now()
        self.update_time = datetime.datetime.now()
        self.error_message = None
        self.service_book_id = book_id  # 关联的图书ID

    def to_dict(self):
        return {
            "id": self.id,
            "service_type": self.service_type,
            "service_item": self.service_item,
            "service_book_id": self.service_book_id,
            "status": self.status,
            "progress": self.progress,
            "progress_data": self.progress_data,
            "create_time": self.create_time.isoformat() if self.create_time else None,
            "update_time": self.update_time.isoformat() if self.update_time else None,
            "error_message": self.error_message,
        }


class BackgroundService:
    """后台任务管理服务"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(BackgroundService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "_initialized"):
            self._tasks = {}  # task_id -> BackgroundTask
            self._tasks_lock = threading.Lock()
            self._initialized = True

    def add_task(self, service_type: str, service_item: str, book_id: int = 0):
        try:
            task = self.update_task(
                service_type=service_type,
                service_item=service_item,
                book_id=book_id,
                progress=0,
                progress_data={"total": 1, "done": 0},
            )
            logging.info(f"Added background task: {service_item}")
            return task
        except Exception as e:
            logging.error(f"Failed to add background task: {service_item}, error: {e}")
            return None

    def update_task(
        self,
        service_type: str,
        service_item: str,
        book_id: int = 0,
        progress: int = 0,
        progress_data: Optional[Dict] = None,
        error_message: Optional[str] = None,
    ) -> BackgroundTask:
        """
        更新或创建任务状态

        Args:
            service_type: 服务类型 (autofill, scan, audio, convert)
            service_item: 服务项目描述
            progress: 进度百分比 (0-100)
            progress_data: 详细进度数据
            error_message: 错误信息

        Returns:
            BackgroundTask: 任务对象
        """
        with self._tasks_lock:
            # 对于 autofill、scan 和 ai_fill 等类型，替换现有任务
            if service_type in [
                BackgroundTask.SERVICE_TYPE_AUTOFILL,
                BackgroundTask.SERVICE_TYPE_SCAN,
                BackgroundTask.SERVICE_TYPE_AI_FILL,
                BackgroundTask.SERVICE_TYPE_AUDIO_IMPORT,
            ]:
                # 删除该类型的现有运行中任务
                tasks_to_remove = [
                    task_id
                    for task_id, task in self._tasks.items()
                    if task.service_type == service_type and task.status == BackgroundTask.STATUS_RUNNING
                ]
                for task_id in tasks_to_remove:
                    del self._tasks[task_id]

            # 创建新任务
            task = BackgroundTask(
                service_type=service_type,
                service_item=service_item,
                book_id=book_id,
                progress=progress,
                progress_data=progress_data or {},
            )

            if error_message:
                task.error_message = error_message
                task.status = BackgroundTask.STATUS_FAILED

            self._tasks[task.id] = task

            # 对于音频转换任务，清理旧记录
            if service_type == BackgroundTask.SERVICE_TYPE_AUDIO:
                self._cleanup_audio_tasks()

            logging.info(f"Created background task: {service_type} - {service_item}, progress: {progress}%")
            return task

    def update_progress(
        self, task_id: int, progress: int, progress_data: Optional[Dict] = None, error_message: Optional[str] = None
    ) -> bool:
        """
        更新任务进度

        Args:
            task_id: 任务ID
            progress: 进度百分比 (0-100)
            progress_data: 详细进度数据
            error_message: 错误信息

        Returns:
            bool: 是否更新成功
        """
        with self._tasks_lock:
            task = self._tasks.get(task_id)

            if not task:
                logging.warning(f"Task {task_id} not found")
                return False

            task.progress = progress
            task.update_time = datetime.datetime.now()

            if progress_data:
                task.progress_data = progress_data

            if error_message:
                task.error_message = error_message
                task.status = BackgroundTask.STATUS_FAILED

            logging.debug(f"Updated task {task_id} progress to {progress}%")
            return True

    def complete_task(self, task_id: int, error_message: Optional[str] = None) -> bool:
        """
        标记任务为完成状态

        Args:
            task_id: 任务ID
            error_message: 错误信息（如果有）

        Returns:
            bool: 是否更新成功
        """
        with self._tasks_lock:
            task = self._tasks.get(task_id)

            if not task:
                logging.warning(f"Task {task_id} not found")
                return False

            task.status = BackgroundTask.STATUS_COMPLETED
            task.progress = 100
            task.update_time = datetime.datetime.now()

            if error_message:
                task.error_message = error_message
                task.status = BackgroundTask.STATUS_FAILED

            logging.info(f"Completed task {task_id}: {task.service_type} - {task.service_item}")
            return True

    def cancel_task(self, task_id: int) -> bool:
        """
        取消任务

        Args:
            task_id: 任务ID

        Returns:
            bool: 是否取消成功
        """
        with self._tasks_lock:
            task = self._tasks.get(task_id)

            if not task:
                logging.warning(f"Task {task_id} not found")
                return False

            task.status = BackgroundTask.STATUS_CANCELLED
            task.update_time = datetime.datetime.now()

            logging.info(f"Cancelled task {task_id}: {task.service_type} - {task.service_item}")
            return True

    def get_running_tasks(self, limit: int = 50) -> List[Dict]:
        """
        获取正在运行的任务列表，按更新时间倒序排列

        Args:
            limit: 返回的最大任务数

        Returns:
            List[Dict]: 任务列表
        """
        with self._tasks_lock:
            # 获取所有任务并按更新时间排序
            all_tasks = list(self._tasks.values())
            running_tasks = [task for task in all_tasks if task.status == BackgroundTask.STATUS_RUNNING]
            for task in running_tasks:
                if task.service_type == BackgroundTask.SERVICE_TYPE_AUDIO and task.service_book_id > 0:
                    try:
                        from webserver.handlers.audio import AudioConversion

                        progress = AudioConversion.get_progress(task.service_book_id)
                        if progress and "converted_chapters" in progress and "total_chapters" in progress:
                            total_chapters = int(progress["total_chapters"])
                            if total_chapters == 0:
                                task.progress = 0
                            else:
                                task.progress = int(progress["converted_chapters"]) * 100 / total_chapters
                        else:
                            task.progress = 0
                    except ImportError:
                        task.progress = 0
            running_tasks.sort(key=lambda t: t.update_time, reverse=True)

            # 限制返回数量
            tasks = running_tasks[:limit]

            return [task.to_dict() for task in tasks]

    def get_task(self, task_id: int) -> Optional[Dict]:
        """
        获取指定任务的详细信息

        Args:
            task_id: 任务ID

        Returns:
            Optional[Dict]: 任务信息，如果不存在则返回None
        """
        with self._tasks_lock:
            task = self._tasks.get(task_id)

            if not task:
                return None

            return task.to_dict()

    def get_task_by_service(self, service_type: str, service_item: str) -> Optional[Dict]:
        """
        根据服务类型和服务项目获取任务

        Args:
            service_type: 服务类型
            service_item: 服务项目

        Returns:
            Optional[Dict]: 任务信息
        """
        with self._tasks_lock:
            # 查找匹配的运行中任务
            matching_tasks = [
                task
                for task in self._tasks.values()
                if task.service_type == service_type
                and task.service_item == service_item
                and task.status == BackgroundTask.STATUS_RUNNING
            ]

            if not matching_tasks:
                return None

            # 返回最新创建的任务
            matching_tasks.sort(key=lambda t: t.create_time, reverse=True)
            return matching_tasks[0].to_dict()

    def _cleanup_audio_tasks(self):
        """清理音频转换任务的旧记录，保留24小时内的记录，最多保留10条"""
        # 计算24小时前的时间
        time_threshold = datetime.datetime.now() - datetime.timedelta(hours=24)

        # 获取所有音频任务，按更新时间倒序
        audio_tasks = [task for task in self._tasks.values() if task.service_type == BackgroundTask.SERVICE_TYPE_AUDIO]
        audio_tasks.sort(key=lambda t: t.update_time, reverse=True)

        # 删除超过24小时且排名在前10之后的记录
        tasks_to_remove = []
        for idx, task in enumerate(audio_tasks):
            # 保留前10条记录
            if idx < 10:
                continue

            # 删除超过24小时的记录
            if task.update_time < time_threshold:
                tasks_to_remove.append(task.id)
                logging.debug(f"Cleaned up old audio task {task.id}: {task.service_item}")

        # 执行删除
        for task_id in tasks_to_remove:
            del self._tasks[task_id]

    def cleanup_old_tasks(self, days: int = 7):
        """
        清理超过指定天数的已完成、已取消或失败的任务

        Args:
            days: 保留天数
        """
        with self._tasks_lock:
            time_threshold = datetime.datetime.now() - datetime.timedelta(days=days)

            tasks_to_remove = [
                task_id
                for task_id, task in self._tasks.items()
                if task.status
                in [BackgroundTask.STATUS_COMPLETED, BackgroundTask.STATUS_CANCELLED, BackgroundTask.STATUS_FAILED]
                and task.update_time < time_threshold
            ]

            for task_id in tasks_to_remove:
                del self._tasks[task_id]

            if tasks_to_remove:
                logging.info(f"Cleaned up {len(tasks_to_remove)} old background tasks")
