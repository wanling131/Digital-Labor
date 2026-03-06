"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BottomNav } from "@/components/h5/bottom-nav"
import { PageHeader } from "@/components/h5/page-header"
import { EmptyState } from "@/components/h5/empty-state"
import {
  Bell,
  FileText,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  ChevronRight,
  BellOff,
} from "lucide-react"

interface Notification {
  id: string
  type: "contract" | "salary" | "attendance" | "system"
  title: string
  content: string
  time: string
  read: boolean
  important?: boolean
}

const notifications: Notification[] = [
  {
    id: "1",
    type: "contract",
    title: "新合同待签署",
    content: "您有一份2024年度劳动合同需要签署，请尽快完成",
    time: "10分钟前",
    read: false,
    important: true,
  },
  {
    id: "2",
    type: "salary",
    title: "工资已发放",
    content: "您3月份的工资￥8,500已发放至工资卡，请注意查收",
    time: "1小时前",
    read: false,
  },
  {
    id: "3",
    type: "attendance",
    title: "考勤提醒",
    content: "今日尚未完成下班打卡，请记得打卡",
    time: "今天 17:30",
    read: false,
  },
  {
    id: "4",
    type: "system",
    title: "系统维护通知",
    content: "系统将于本周六凌晨2:00-4:00进行维护升级",
    time: "昨天 15:00",
    read: true,
  },
  {
    id: "5",
    type: "contract",
    title: "合同即将到期",
    content: "您的劳动合同将于30天后到期，请联系管理人员续签",
    time: "3天前",
    read: true,
  },
  {
    id: "6",
    type: "salary",
    title: "2月工资已发放",
    content: "您2月份的工资￥8,200已发放至工资卡",
    time: "2024-03-01",
    read: true,
  },
]

const typeConfig = {
  contract: {
    icon: FileText,
    color: "bg-accent/20 text-accent",
    label: "合同",
  },
  salary: {
    icon: Wallet,
    color: "bg-chart-5/20 text-chart-5",
    label: "工资",
  },
  attendance: {
    icon: Clock,
    color: "bg-primary/20 text-primary",
    label: "考勤",
  },
  system: {
    icon: Megaphone,
    color: "bg-chart-4/20 text-chart-4",
    label: "系统",
  },
}

export default function NotificationsPage() {
  const [notificationList, setNotificationList] = useState(notifications)
  
  const unreadCount = notificationList.filter((n) => !n.read).length
  const unreadNotifications = notificationList.filter((n) => !n.read)
  const readNotifications = notificationList.filter((n) => n.read)

  const markAsRead = (id: string) => {
    setNotificationList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotificationList((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const config = typeConfig[notification.type]
    const Icon = config.icon

    return (
      <div
        className={`p-4 border-b border-border last:border-0 active:bg-muted/50 transition-colors cursor-pointer relative ${
          !notification.read ? "bg-primary/5" : ""
        }`}
        onClick={() => markAsRead(notification.id)}
      >
        {!notification.read && (
          <span className="absolute top-4 right-4 h-2 w-2 bg-destructive rounded-full" />
        )}
        {notification.important && (
          <Badge className="absolute top-4 right-8 bg-destructive text-destructive-foreground text-xs">
            重要
          </Badge>
        )}
        <div className="flex gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <div className="flex items-center gap-2 mb-1">
              <p className={`font-medium text-sm ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                {notification.title}
              </p>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {notification.content}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{notification.time}</span>
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20 min-h-screen bg-background">
      <PageHeader
        title="消息通知"
        rightAction={
          unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={markAllAsRead}
            >
              全部已读
            </Button>
          )
        }
      />

      <div className="px-4 pt-4">
        {/* 统计 */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="gap-1">
            <Bell className="h-3 w-3" />
            共 {notificationList.length} 条
          </Badge>
          {unreadCount > 0 && (
            <Badge className="gap-1 bg-destructive text-destructive-foreground">
              {unreadCount} 条未读
            </Badge>
          )}
        </div>

        <Tabs defaultValue="all">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="all">
              全部
            </TabsTrigger>
            <TabsTrigger value="unread">
              未读 {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="read">
              已读
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardContent className="p-0">
                {notificationList.length > 0 ? (
                  notificationList.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                ) : (
                  <EmptyState
                    icon={BellOff}
                    title="暂无消息"
                    description="您的消息列表为空"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unread">
            <Card>
              <CardContent className="p-0">
                {unreadNotifications.length > 0 ? (
                  unreadNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    title="没有未读消息"
                    description="您已阅读所有消息"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="read">
            <Card>
              <CardContent className="p-0">
                {readNotifications.length > 0 ? (
                  readNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                ) : (
                  <EmptyState
                    icon={BellOff}
                    title="暂无已读消息"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  )
}
